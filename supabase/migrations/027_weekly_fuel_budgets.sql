-- Flexible yearly, monthly and weekly fuel budget periods without requiring a Visit Plan.

alter table public.fuel_budgets add column fiscal_week integer check (fiscal_week between 1 and 53);

do $$ declare constraint_name text;
begin
  select conname into constraint_name from pg_constraint
  where conrelid='public.fuel_budgets'::regclass and contype='u'
    and pg_get_constraintdef(oid) like '%fiscal_year%fiscal_month%province_id%sales_user_id%currency%'
  limit 1;
  if constraint_name is not null then execute format('alter table public.fuel_budgets drop constraint %I',constraint_name); end if;
end $$;

create unique index fuel_budgets_period_scope_unique on public.fuel_budgets(fiscal_year,fiscal_month,fiscal_week,province_id,sales_user_id,currency) nulls not distinct;

drop trigger if exists fuel_budgets_prepare on public.fuel_budgets;
drop function if exists public.prepare_fuel_budget();

drop view if exists public.fuel_budget_balances;
create view public.fuel_budget_balances with (security_invoker=true) as
select budget.*, province.name_kh as province_name_kh, sales.full_name as sales_name,
  coalesce((select sum(expense.total_amount) from public.fuel_expenses expense where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency
    and expense.province_id=budget.province_id and expense.sales_user_id=budget.sales_user_id
    and extract(year from expense.expense_date)=budget.fiscal_year
    and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)
    and (budget.fiscal_week is null or extract(week from expense.expense_date)=budget.fiscal_week)),0) as used_amount,
  budget.allocated_amount-coalesce((select sum(expense.total_amount) from public.fuel_expenses expense where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency
    and expense.province_id=budget.province_id and expense.sales_user_id=budget.sales_user_id
    and extract(year from expense.expense_date)=budget.fiscal_year
    and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)
    and (budget.fiscal_week is null or extract(week from expense.expense_date)=budget.fiscal_week)),0) as remaining_amount
from public.fuel_budgets budget join public.provinces province on province.id=budget.province_id join public.profiles sales on sales.id=budget.sales_user_id;

create or replace function public.decide_fuel_expense(p_fuel_expense_id uuid,p_decision text,p_comment text default null) returns public.fuel_expenses language plpgsql security definer set search_path=public as $$
declare current_row public.fuel_expenses; result public.fuel_expenses; available numeric;
begin
  if not public.has_permission('fuel.approve') then raise exception 'Access denied'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into current_row from public.fuel_expenses where id=p_fuel_expense_id and status='submitted' for update;
  if current_row.id is null then raise exception 'Fuel expense is not pending approval'; end if;
  if current_row.created_by=auth.uid() then raise exception 'Creator cannot approve own fuel expense'; end if;
  if p_decision='rejected' and char_length(trim(coalesce(p_comment,'')))<3 then raise exception 'Rejection comment is required'; end if;
  if p_decision='approved' then
    select max(remaining_amount) into available from public.fuel_budget_balances where fiscal_year=extract(year from current_row.expense_date)
      and (fiscal_month is null or fiscal_month=extract(month from current_row.expense_date))
      and (fiscal_week is null or fiscal_week=extract(week from current_row.expense_date))
      and province_id=current_row.province_id and sales_user_id=current_row.sales_user_id and currency=current_row.currency and status='active';
    if available is null then raise exception 'No active fuel budget is configured for this period, Sales and province'; end if;
    if current_row.total_amount>available then raise exception 'Fuel budget exceeded. Available: %, requested: %',available,current_row.total_amount; end if;
  end if;
  update public.fuel_expenses set status=p_decision,approved_by=case when p_decision='approved' then auth.uid() end,approved_at=case when p_decision='approved' then now() end,note=coalesce(nullif(trim(p_comment),''),note) where id=p_fuel_expense_id returning * into result;
  if p_decision='approved' then update public.vehicles set current_odometer=greatest(current_odometer,result.end_odometer) where id=result.vehicle_id; end if;
  return result;
end $$;
grant select on public.fuel_budget_balances to authenticated;
