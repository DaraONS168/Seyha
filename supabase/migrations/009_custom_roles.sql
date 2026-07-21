create table public.app_roles (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,39}$'),
  name text not null unique check (char_length(trim(name)) between 2 and 50),
  permissions jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_roles(key,name,permissions,is_system) values
  ('admin','Administrator','["dashboard","customers","follow_ups","visit_plans","calls","reports","sales_team","notifications","settings","user_management"]',true),
  ('manager','Manager','["dashboard","customers","follow_ups","visit_plans","calls","reports","sales_team","notifications"]',true),
  ('sales','Sales','["dashboard","customers","follow_ups","visit_plans","calls","notifications"]',true),
  ('user','User','["dashboard","notifications"]',true)
on conflict (key) do update set name=excluded.name, permissions=excluded.permissions;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_fkey foreign key (role) references public.app_roles(key) on update cascade;

create trigger app_roles_updated_at before update on public.app_roles for each row execute function public.set_updated_at();
alter table public.app_roles enable row level security;
create policy app_roles_read on public.app_roles for select to authenticated using (true);
create policy app_roles_admin_write on public.app_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Custom roles use their selected permissions for broad access. Sales keeps assigned-only access.
drop policy if exists profiles_permission_select on public.profiles;
create policy profiles_permission_select on public.profiles for select to authenticated
  using (public.current_user_role() <> 'sales' and (public.has_permission('sales_team') or public.has_permission('reports')));
drop policy if exists customers_manager_permission on public.customers;
create policy customers_manager_permission on public.customers for all to authenticated
  using (public.current_user_role() <> 'sales' and public.has_permission('customers'))
  with check (public.current_user_role() <> 'sales' and public.has_permission('customers'));
drop policy if exists calls_manager_permission on public.call_histories;
create policy calls_manager_permission on public.call_histories for all to authenticated
  using (public.current_user_role() <> 'sales' and public.has_permission('calls'))
  with check (public.current_user_role() <> 'sales' and public.has_permission('calls'));
drop policy if exists followups_manager_permission on public.follow_ups;
create policy followups_manager_permission on public.follow_ups for all to authenticated
  using (public.current_user_role() <> 'sales' and public.has_permission('follow_ups'))
  with check (public.current_user_role() <> 'sales' and public.has_permission('follow_ups'));
drop policy if exists activities_manager_permission on public.activities;
create policy activities_manager_permission on public.activities for select to authenticated
  using (public.current_user_role() <> 'sales' and public.has_permission('reports'));
drop policy if exists settings_manager_permission on public.settings;
create policy settings_manager_permission on public.settings for all to authenticated
  using (public.current_user_role() <> 'sales' and public.has_permission('settings'))
  with check (public.current_user_role() <> 'sales' and public.has_permission('settings'));
