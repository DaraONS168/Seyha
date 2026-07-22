-- Fuel budget allocation by fiscal period, province and sales officer.

create table public.fuel_budgets (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null check (fiscal_year between 2020 and 2100),
  fiscal_month integer check (fiscal_month between 1 and 12),
  province_id bigint not null references public.provinces(id) on delete restrict,
  sales_user_id uuid not null references public.profiles(id) on delete restrict,
  allocated_amount numeric(14,2) not null check (allocated_amount > 0),
  currency text not null default 'KHR' check (currency in ('KHR','USD')),
  status text not null default 'active' check (status in ('active','inactive','closed')),
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct(fiscal_year,fiscal_month,province_id,sales_user_id,currency)
);

create index fuel_budgets_filters_idx on public.fuel_budgets(fiscal_year,fiscal_month,province_id,sales_user_id,status);
create trigger fuel_budgets_updated_at before update on public.fuel_budgets for each row execute function public.set_updated_at();

create or replace view public.fuel_budget_balances with (security_invoker=true) as
select budget.*,
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
from public.fuel_budgets budget;

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
    select max(remaining_amount) into available from public.fuel_budget_balances
      where fiscal_year=extract(year from current_row.expense_date) and (fiscal_month is null or fiscal_month=extract(month from current_row.expense_date))
        and province_id=current_row.province_id and sales_user_id=current_row.sales_user_id and currency=current_row.currency and status='active';
    if available is null then raise exception 'No active fuel budget is configured for this Sales and location'; end if;
    if current_row.total_amount>available then raise exception 'Fuel budget exceeded. Available: %, requested: %',available,current_row.total_amount; end if;
  end if;
  update public.fuel_expenses set status=p_decision,approved_by=case when p_decision='approved' then auth.uid() end,approved_at=case when p_decision='approved' then now() end,note=coalesce(nullif(trim(p_comment),''),note) where id=p_fuel_expense_id returning * into result;
  if p_decision='approved' then update public.vehicles set current_odometer=greatest(current_odometer,result.end_odometer) where id=result.vehicle_id; end if;
  return result;
end $$;

insert into public.app_roles(key,name,permissions,is_system) values('fuel_budget_manager','Fuel Budget Manager','["expenses.view","fuel.view","fuel.reports","fuel.budgets.view","fuel.budgets.manage","notifications"]',true) on conflict(key) do update set permissions=excluded.permissions;
update public.app_roles set permissions=permissions||'["fuel.budgets.view","fuel.budgets.manage"]'::jsonb where key='admin';
update public.app_roles set permissions=permissions||'["fuel.budgets.view"]'::jsonb where key='fuel_reviewer';
update public.profiles profile set permissions=role.permissions,updated_at=now() from public.app_roles role where profile.role=role.key and profile.permissions is distinct from role.permissions;

alter table public.fuel_budgets enable row level security;
create policy fuel_budgets_read on public.fuel_budgets for select to authenticated using(public.has_permission('fuel.budgets.view'));
create policy fuel_budgets_manage on public.fuel_budgets for all to authenticated using(public.has_permission('fuel.budgets.manage')) with check(public.has_permission('fuel.budgets.manage'));
grant select on public.fuel_budget_balances to authenticated;
