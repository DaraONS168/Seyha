-- Standardize every application module on view/create/update/delete permissions.
do $$
declare
  mapping record;
begin
  for mapping in select * from (values
    ('dashboard','dashboard'), ('notifications','notifications'), ('customers','customers'),
    ('follow_ups','follow_ups'), ('visit_plans','visit_plans'), ('calls','calls'),
    ('reports','reports'), ('sales_team','sales_team'), ('settings','settings'),
    ('user_management','users'), ('vehicles.manage','vehicles'),
    ('expenses.budgets.manage','expenses.budgets'), ('fuel.budgets.manage','fuel.budgets')
  ) as values_table(legacy_key,module_key)
  loop
    update public.app_roles
    set permissions = permissions || jsonb_build_array(
      mapping.module_key || '.view', mapping.module_key || '.create',
      mapping.module_key || '.update', mapping.module_key || '.delete'
    )
    where permissions ? mapping.legacy_key;
  end loop;
end $$;

-- Existing granular modules receive missing CRUD actions without broadening non-admin roles.
update public.app_roles set permissions=permissions||'["markets.update"]'::jsonb where permissions ? 'markets.create' and not permissions ? 'markets.update';
update public.app_roles set permissions=permissions||'["expenses.update"]'::jsonb where permissions ? 'expenses.create' and not permissions ? 'expenses.update';
update public.app_roles set permissions=permissions||'["fuel.update"]'::jsonb where permissions ? 'fuel.create' and not permissions ? 'fuel.update';

-- Administrator always owns the complete CRUD matrix.
update public.app_roles role
set permissions = role.permissions || permissions.all_permissions
from (
  select jsonb_agg(module_key || '.' || action) as all_permissions
  from (values ('dashboard'),('notifications'),('customers'),('follow_ups'),('visit_plans'),('calls'),('reports'),('sales_team'),('markets'),('expenses'),('expenses.budgets'),('fuel'),('fuel.budgets'),('vehicles'),('users'),('settings')) modules(module_key)
  cross join (values ('view'),('create'),('update'),('delete')) actions(action)
) permissions
where role.key='admin';

-- Remove duplicates while retaining workflow permissions.
update public.app_roles role
set permissions=(select coalesce(jsonb_agg(value order by value),'[]'::jsonb) from (select distinct value from jsonb_array_elements_text(role.permissions)) unique_permissions);

update public.profiles profile set permissions=role.permissions,updated_at=now()
from public.app_roles role where profile.role=role.key and profile.permissions is distinct from role.permissions;

create or replace function public.has_permission(permission_name text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles profile
    where profile.id=auth.uid() and profile.is_active=true
      and (profile.role='admin' or profile.permissions ? permission_name)
  );
$$;

-- User and role directory access.
drop policy if exists profiles_permission_select on public.profiles;
create policy profiles_permission_select on public.profiles for select to authenticated using(public.has_permission('users.view'));

-- Customers CRUD.
drop policy if exists customers_manager_permission on public.customers;
drop policy if exists customers_sales_select on public.customers;
drop policy if exists customers_sales_insert on public.customers;
drop policy if exists customers_sales_update on public.customers;
create policy customers_permission_select on public.customers for select to authenticated using(public.has_permission('customers.view') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy customers_permission_insert on public.customers for insert to authenticated with check(public.has_permission('customers.create') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy customers_permission_update on public.customers for update to authenticated using(public.has_permission('customers.update') and (public.current_user_role()<>'sales' or assigned_to=auth.uid())) with check(public.has_permission('customers.update') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy customers_permission_delete on public.customers for delete to authenticated using(public.has_permission('customers.delete') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));

-- Follow Up CRUD.
drop policy if exists followups_manager_permission on public.follow_ups;
drop policy if exists followups_sales_select on public.follow_ups;
drop policy if exists followups_sales_insert on public.follow_ups;
drop policy if exists followups_sales_update on public.follow_ups;
create policy followups_permission_select on public.follow_ups for select to authenticated using(public.has_permission('follow_ups.view') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy followups_permission_insert on public.follow_ups for insert to authenticated with check(public.has_permission('follow_ups.create') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy followups_permission_update on public.follow_ups for update to authenticated using(public.has_permission('follow_ups.update') and (public.current_user_role()<>'sales' or assigned_to=auth.uid())) with check(public.has_permission('follow_ups.update') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy followups_permission_delete on public.follow_ups for delete to authenticated using(public.has_permission('follow_ups.delete') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));

-- Call history CRUD supported by the current table.
drop policy if exists calls_manager_permission on public.call_histories;
drop policy if exists calls_sales_select on public.call_histories;
drop policy if exists calls_sales_insert on public.call_histories;
create policy calls_permission_select on public.call_histories for select to authenticated using(public.has_permission('calls.view') and public.can_access_customer(customer_id));
create policy calls_permission_insert on public.call_histories for insert to authenticated with check(public.has_permission('calls.create') and called_by=auth.uid() and public.can_access_customer(customer_id));
create policy calls_permission_update on public.call_histories for update to authenticated using(public.has_permission('calls.update')) with check(public.has_permission('calls.update'));
create policy calls_permission_delete on public.call_histories for delete to authenticated using(public.has_permission('calls.delete'));

-- Visit plan CRUD replaces role-only policies.
drop policy if exists visit_plans_sales_select on public.visit_plans;
drop policy if exists visit_plans_sales_insert on public.visit_plans;
drop policy if exists visit_plans_sales_update on public.visit_plans;
create policy visit_plans_permission_select on public.visit_plans for select to authenticated using(public.has_permission('visit_plans.view') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy visit_plans_permission_insert on public.visit_plans for insert to authenticated with check(public.has_permission('visit_plans.create') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy visit_plans_permission_update on public.visit_plans for update to authenticated using(public.has_permission('visit_plans.update') and (public.current_user_role()<>'sales' or assigned_to=auth.uid())) with check(public.has_permission('visit_plans.update') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
create policy visit_plans_permission_delete on public.visit_plans for delete to authenticated using(public.has_permission('visit_plans.delete') and (public.current_user_role()<>'sales' or assigned_to=auth.uid()));
