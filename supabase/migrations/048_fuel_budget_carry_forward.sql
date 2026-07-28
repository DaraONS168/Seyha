-- Carry remaining fuel budget into the next top-up for the same Sales and currency.

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
        and expense.visit_plan_id = budget.visit_plan_id
        and extract(year from expense.expense_date) = budget.fiscal_year
        and (budget.fiscal_month is null or extract(month from expense.expense_date) = budget.fiscal_month)
        and (budget.fiscal_week is null or extract(week from expense.expense_date) = budget.fiscal_week)
    ), 0) as used_amount
  from public.fuel_budgets budget
  join public.provinces province on province.id = budget.province_id
  join public.profiles sales on sales.id = budget.sales_user_id
  join public.visit_plans plan on plan.id = budget.visit_plan_id
),
running_balances as (
  select
    budget_usage.*,
    coalesce(sum(allocated_amount - used_amount) over (
      partition by sales_user_id, currency
      order by fiscal_year, coalesce(fiscal_month, 0), coalesce(fiscal_week, 0), created_at, id
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

grant select on public.fuel_budget_balances to authenticated;
