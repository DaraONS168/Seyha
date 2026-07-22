-- Link each fuel budget configuration to its source Visit Plan.

alter table public.fuel_budgets add column visit_plan_id uuid references public.visit_plans(id) on delete restrict;
create index fuel_budgets_visit_plan_idx on public.fuel_budgets(visit_plan_id);

create or replace function public.prepare_fuel_budget() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_row public.visit_plans; matched_province_id bigint;
begin
  if new.visit_plan_id is not null then
    select * into plan_row from public.visit_plans where id=new.visit_plan_id and status<>'cancelled';
    if plan_row.id is null then raise exception 'Selected Visit Plan is not available'; end if;
    if plan_row.assigned_to is distinct from new.sales_user_id then raise exception 'Visit Plan does not belong to selected Sales'; end if;
    select id into matched_province_id from public.provinces
      where is_active and (lower(trim(name_kh))=lower(trim(plan_row.province)) or lower(trim(coalesce(name_en,'')))=lower(trim(plan_row.province))) limit 1;
    if matched_province_id is null then raise exception 'Visit Plan province does not match Province lookup: %',plan_row.province; end if;
    new.province_id:=matched_province_id;
    new.fiscal_year:=extract(year from plan_row.start_date);
    new.fiscal_month:=extract(month from plan_row.start_date);
  end if;
  if tg_op='UPDATE' then new.updated_by:=auth.uid(); end if;
  return new;
end $$;
create trigger fuel_budgets_prepare before insert or update on public.fuel_budgets for each row execute function public.prepare_fuel_budget();

drop view if exists public.fuel_budget_balances;
create view public.fuel_budget_balances with (security_invoker=true) as
select budget.*, province.name_kh as province_name_kh, sales.full_name as sales_name, plan.title as visit_plan_title,
  coalesce((select sum(expense.total_amount) from public.fuel_expenses expense where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency and expense.province_id=budget.province_id and expense.sales_user_id=budget.sales_user_id and extract(year from expense.expense_date)=budget.fiscal_year and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)),0) as used_amount,
  budget.allocated_amount-coalesce((select sum(expense.total_amount) from public.fuel_expenses expense where expense.deleted_at is null and expense.status='approved' and expense.currency=budget.currency and expense.province_id=budget.province_id and expense.sales_user_id=budget.sales_user_id and extract(year from expense.expense_date)=budget.fiscal_year and (budget.fiscal_month is null or extract(month from expense.expense_date)=budget.fiscal_month)),0) as remaining_amount
from public.fuel_budgets budget join public.provinces province on province.id=budget.province_id join public.profiles sales on sales.id=budget.sales_user_id left join public.visit_plans plan on plan.id=budget.visit_plan_id;
grant select on public.fuel_budget_balances to authenticated;
