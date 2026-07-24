-- Provide Visit Plan options for fuel budget setup.

create or replace function public.fuel_budget_visit_plan_options(p_sales_user_id uuid)
returns table(
  id uuid,
  title text,
  province text,
  district text,
  start_date date,
  end_date date,
  status text,
  assigned_to uuid
)
language sql stable security definer set search_path=public as $$
  select
    plan.id,
    plan.title,
    plan.province,
    plan.district,
    plan.start_date,
    plan.end_date,
    plan.status,
    plan.assigned_to
  from public.visit_plans plan
  where plan.assigned_to = p_sales_user_id
    and plan.status <> 'cancelled'
    and (public.has_permission('fuel.budgets.manage') or plan.assigned_to = auth.uid())
  order by plan.start_date desc, plan.created_at desc;
$$;

grant execute on function public.fuel_budget_visit_plan_options(uuid) to authenticated;
