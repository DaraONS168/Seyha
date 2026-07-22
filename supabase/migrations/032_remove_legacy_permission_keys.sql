-- Remove superseded permission keys after all roles have been migrated to CRUD keys.
update public.app_roles role
set permissions=(select coalesce(jsonb_agg(value order by value),'[]'::jsonb)
  from (
    select distinct value from jsonb_array_elements_text(role.permissions)
    where value not in ('dashboard','notifications','customers','follow_ups','visit_plans','calls','reports','sales_team','settings','user_management','vehicles.manage','expenses.budgets.manage','fuel.budgets.manage')
  ) current_permissions);

update public.profiles profile set permissions=role.permissions,updated_at=now()
from public.app_roles role where profile.role=role.key and profile.permissions is distinct from role.permissions;

drop policy if exists activities_manager_permission on public.activities;
create policy activities_permission_select on public.activities for select to authenticated using(public.has_permission('reports.view'));

drop policy if exists settings_manager_permission on public.settings;
create policy settings_permission_insert on public.settings for insert to authenticated with check(public.has_permission('settings.create'));
create policy settings_permission_update on public.settings for update to authenticated using(public.has_permission('settings.update')) with check(public.has_permission('settings.update'));
create policy settings_permission_delete on public.settings for delete to authenticated using(public.has_permission('settings.delete'));
