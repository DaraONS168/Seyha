-- Use an exact budget date and allow fuel budgets without a Visit Plan.

alter table public.fuel_budgets add column if not exists budget_date date;

update public.fuel_budgets
set budget_date = make_date(fiscal_year, coalesce(fiscal_month, 1), 1)
where budget_date is null;

alter table public.fuel_budgets alter column budget_date set not null;

drop index if exists public.fuel_budgets_period_plan_unique;
drop index if exists public.fuel_budgets_period_scope_unique;
drop index if exists public.fuel_budgets_date_plan_unique;
drop index if exists public.fuel_budgets_date_sales_unique;

create unique index fuel_budgets_date_plan_unique
  on public.fuel_budgets(budget_date, sales_user_id, visit_plan_id, currency)
  where visit_plan_id is not null;

create unique index fuel_budgets_date_sales_unique
  on public.fuel_budgets(budget_date, sales_user_id, province_id, currency)
  where visit_plan_id is null;

create index if not exists fuel_budgets_date_idx on public.fuel_budgets(budget_date, sales_user_id, province_id, status);

create or replace function public.prepare_fuel_budget_plan() returns trigger
language plpgsql security definer set search_path=public as $$
declare plan_row public.visit_plans; matched_province_id bigint;
begin
  if new.budget_date is null then raise exception 'Budget date is required'; end if;
  new.fiscal_year := extract(year from new.budget_date)::integer;
  new.fiscal_month := extract(month from new.budget_date)::integer;
  new.fiscal_week := null;

  if new.visit_plan_id is not null then
    select * into plan_row from public.visit_plans where id = new.visit_plan_id and status <> 'cancelled';
    if plan_row.id is null or plan_row.assigned_to is distinct from new.sales_user_id then raise exception 'Invalid Visit Plan for selected Sales'; end if;
    select id into matched_province_id from public.provinces where is_active and (
      public.normalize_location_name(name_kh) = public.normalize_location_name(plan_row.province)
      or public.normalize_location_name(name_en) = public.normalize_location_name(plan_row.province)
    ) limit 1;
    if matched_province_id is null then raise exception 'Visit Plan province does not match Province lookup: %', plan_row.province; end if;
    new.province_id := matched_province_id;
  elsif new.province_id is null then
    raise exception 'Province is required when Visit Plan is not selected';
  end if;

  if tg_op = 'UPDATE' then new.updated_by := auth.uid(); end if;
  return new;
end $$;

drop view if exists public.fuel_budget_balances;

create view public.fuel_budget_balances with (security_invoker=true) as
with budget_usage as (
  select
    budget.*,
    province.name_kh as province_name_kh,
    sales.full_name as sales_name,
    plan.title as visit_plan_title,
    coalesce((
      select sum(expense.total_amount)
      from public.fuel_expenses expense
      where expense.deleted_at is null
        and expense.status = 'approved'
        and expense.currency = budget.currency
        and expense.sales_user_id = budget.sales_user_id
        and expense.province_id = budget.province_id
        and expense.expense_date = budget.budget_date
        and (budget.visit_plan_id is null or expense.visit_plan_id = budget.visit_plan_id)
    ), 0) as used_amount
  from public.fuel_budgets budget
  join public.provinces province on province.id = budget.province_id
  join public.profiles sales on sales.id = budget.sales_user_id
  left join public.visit_plans plan on plan.id = budget.visit_plan_id
),
running_balances as (
  select
    budget_usage.*,
    coalesce(sum(allocated_amount - used_amount) over (
      partition by sales_user_id, currency
      order by budget_date, created_at, id
      rows between unbounded preceding and 1 preceding
    ), 0) as raw_carry_forward_amount
  from budget_usage
)
select
  running_balances.*,
  greatest(raw_carry_forward_amount, 0) as carry_forward_amount,
  allocated_amount + greatest(raw_carry_forward_amount, 0) as available_amount,
  allocated_amount + greatest(raw_carry_forward_amount, 0) - used_amount as remaining_amount
from running_balances;

create or replace function public.decide_fuel_expense(p_fuel_expense_id uuid, p_decision text, p_comment text default null)
returns public.fuel_expenses language plpgsql security definer set search_path=public as $$
declare current_row public.fuel_expenses; result public.fuel_expenses; available numeric;
begin
  if not public.has_permission('fuel.approve') then raise exception 'Access denied'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into current_row from public.fuel_expenses where id = p_fuel_expense_id and status = 'submitted' for update;
  if current_row.id is null then raise exception 'Fuel expense is not pending approval'; end if;
  if current_row.created_by = auth.uid() then raise exception 'Creator cannot approve own fuel expense'; end if;
  if p_decision = 'rejected' and char_length(trim(coalesce(p_comment,''))) < 3 then raise exception 'Rejection comment is required'; end if;

  if p_decision = 'approved' then
    select max(remaining_amount) into available
    from public.fuel_budget_balances
    where budget_date = current_row.expense_date
      and sales_user_id = current_row.sales_user_id
      and province_id = current_row.province_id
      and currency = current_row.currency
      and status = 'active'
      and (visit_plan_id is null or visit_plan_id = current_row.visit_plan_id);

    if available is null then raise exception 'No active fuel budget is configured for this Sales, date and location'; end if;
    if current_row.total_amount > available then raise exception 'Fuel budget exceeded. Available: %, requested: %', available, current_row.total_amount; end if;
  end if;

  update public.fuel_expenses
  set status = p_decision,
      approved_by = case when p_decision = 'approved' then auth.uid() end,
      approved_at = case when p_decision = 'approved' then now() end,
      note = coalesce(nullif(trim(p_comment),''), note)
  where id = p_fuel_expense_id
  returning * into result;

  if p_decision = 'approved' then
    update public.vehicles set current_odometer = greatest(current_odometer, result.end_odometer) where id = result.vehicle_id;
  end if;

  return result;
end $$;

grant select on public.fuel_budget_balances to authenticated;
grant execute on function public.decide_fuel_expense(uuid,text,text) to authenticated;
