-- Scope weekly fuel budgets to the selected Visit Plan while deriving its province.

drop index if exists public.fuel_budgets_period_scope_unique;
create unique index fuel_budgets_period_plan_unique on public.fuel_budgets(fiscal_year,fiscal_month,fiscal_week,sales_user_id,visit_plan_id,currency) nulls not distinct;

create or replace function public.prepare_fuel_budget_plan() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_row public.visit_plans; matched_province_id bigint;
begin
  if new.visit_plan_id is null then raise exception 'Visit Plan is required'; end if;
  select * into plan_row from public.visit_plans where id=new.visit_plan_id and status<>'cancelled';
  if plan_row.id is null or plan_row.assigned_to is distinct from new.sales_user_id then raise exception 'Invalid Visit Plan for selected Sales'; end if;
  select id into matched_province_id from public.provinces where is_active and (lower(trim(name_kh))=lower(trim(plan_row.province)) or lower(trim(coalesce(name_en,'')))=lower(trim(plan_row.province))) limit 1;
  if matched_province_id is null then raise exception 'Visit Plan province does not match Province lookup: %',plan_row.province; end if;
  new.province_id:=matched_province_id;
  if tg_op='UPDATE' then new.updated_by:=auth.uid(); end if;
  return new;
end $$;
create trigger fuel_budgets_prepare_plan before insert or update on public.fuel_budgets for each row execute function public.prepare_fuel_budget_plan();

drop view if exists public.fuel_budget_balances;
create view public.fuel_budget_balances with (security_invoker=true) as
select budget.*, province.name_kh as province_name_kh, sales.full_name as sales_name, plan.title as visit_plan_title,
  coalesce((select sum(expense.total_amount) from public.fuel_expenses expense where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency
    and expense.visit_plan_id=budget.visit_plan_id and extract(year from expense.expense_date)=budget.fiscal_year
    and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)
    and (budget.fiscal_week is null or extract(week from expense.expense_date)=budget.fiscal_week)),0) as used_amount,
  budget.allocated_amount-coalesce((select sum(expense.total_amount) from public.fuel_expenses expense where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency
    and expense.visit_plan_id=budget.visit_plan_id and extract(year from expense.expense_date)=budget.fiscal_year
    and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)
    and (budget.fiscal_week is null or extract(week from expense.expense_date)=budget.fiscal_week)),0) as remaining_amount
from public.fuel_budgets budget join public.provinces province on province.id=budget.province_id join public.profiles sales on sales.id=budget.sales_user_id join public.visit_plans plan on plan.id=budget.visit_plan_id;

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
    select max(remaining_amount) into available from public.fuel_budget_balances where visit_plan_id=current_row.visit_plan_id
      and fiscal_year=extract(year from current_row.expense_date) and (fiscal_month is null or fiscal_month=extract(month from current_row.expense_date))
      and (fiscal_week is null or fiscal_week=extract(week from current_row.expense_date)) and currency=current_row.currency and status='active';
    if available is null then raise exception 'No active fuel budget is configured for this Visit Plan and period'; end if;
    if current_row.total_amount>available then raise exception 'Fuel budget exceeded. Available: %, requested: %',available,current_row.total_amount; end if;
  end if;
  update public.fuel_expenses set status=p_decision,approved_by=case when p_decision='approved' then auth.uid() end,approved_at=case when p_decision='approved' then now() end,note=coalesce(nullif(trim(p_comment),''),note) where id=p_fuel_expense_id returning * into result;
  if p_decision='approved' then update public.vehicles set current_odometer=greatest(current_odometer,result.end_odometer) where id=result.vehicle_id; end if;
  return result;
end $$;
grant select on public.fuel_budget_balances to authenticated;
