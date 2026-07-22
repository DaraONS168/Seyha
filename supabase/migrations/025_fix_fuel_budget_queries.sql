-- Expose display names directly because PostgREST cannot reliably infer view relationships.

drop view if exists public.fuel_budget_balances;
create view public.fuel_budget_balances with (security_invoker=true) as
select budget.*,
  province.name_kh as province_name_kh,
  sales.full_name as sales_name,
  coalesce((select sum(expense.total_amount) from public.fuel_expenses expense
    where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency
      and expense.province_id=budget.province_id and expense.sales_user_id=budget.sales_user_id
      and extract(year from expense.expense_date)=budget.fiscal_year
      and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)),0) as used_amount,
  budget.allocated_amount-coalesce((select sum(expense.total_amount) from public.fuel_expenses expense
    where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency
      and expense.province_id=budget.province_id and expense.sales_user_id=budget.sales_user_id
      and extract(year from expense.expense_date)=budget.fiscal_year
      and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)),0) as remaining_amount
from public.fuel_budgets budget
join public.provinces province on province.id=budget.province_id
join public.profiles sales on sales.id=budget.sales_user_id;

create or replace function public.fuel_budget_visit_plan_locations(p_sales_user_id uuid)
returns table(id uuid,title text,province text,start_date date,end_date date,status text)
language sql stable security definer set search_path=public as $$
  select plan.id,plan.title,plan.province,plan.start_date,plan.end_date,plan.status
  from public.visit_plans plan
  where plan.assigned_to=p_sales_user_id and plan.status<>'cancelled'
    and (public.has_permission('fuel.budgets.manage') or plan.assigned_to=auth.uid())
  order by plan.start_date desc;
$$;
grant select on public.fuel_budget_balances to authenticated;
grant execute on function public.fuel_budget_visit_plan_locations(uuid) to authenticated;
