alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'manager', 'sales', 'user'));

-- Let Manager and User roles receive data access only from their selected permissions.
drop policy if exists profiles_permission_select on public.profiles;
create policy profiles_permission_select on public.profiles for select to authenticated
  using (public.current_user_role() in ('manager', 'user') and (public.has_permission('sales_team') or public.has_permission('reports')));
drop policy if exists customers_manager_permission on public.customers;
create policy customers_manager_permission on public.customers for all to authenticated
  using (public.current_user_role() in ('manager', 'user') and public.has_permission('customers'))
  with check (public.current_user_role() in ('manager', 'user') and public.has_permission('customers'));
drop policy if exists calls_manager_permission on public.call_histories;
create policy calls_manager_permission on public.call_histories for all to authenticated
  using (public.current_user_role() in ('manager', 'user') and public.has_permission('calls'))
  with check (public.current_user_role() in ('manager', 'user') and public.has_permission('calls'));
drop policy if exists followups_manager_permission on public.follow_ups;
create policy followups_manager_permission on public.follow_ups for all to authenticated
  using (public.current_user_role() in ('manager', 'user') and public.has_permission('follow_ups'))
  with check (public.current_user_role() in ('manager', 'user') and public.has_permission('follow_ups'));
drop policy if exists activities_manager_permission on public.activities;
create policy activities_manager_permission on public.activities for select to authenticated
  using (public.current_user_role() in ('manager', 'user') and public.has_permission('reports'));
drop policy if exists settings_manager_permission on public.settings;
create policy settings_manager_permission on public.settings for all to authenticated
  using (public.current_user_role() in ('manager', 'user') and public.has_permission('settings'))
  with check (public.current_user_role() in ('manager', 'user') and public.has_permission('settings'));
