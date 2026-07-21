create table if not exists public.user_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_audit_logs_created_idx on public.user_audit_logs(created_at desc);
alter table public.user_audit_logs enable row level security;
create policy user_audit_admin_select on public.user_audit_logs for select to authenticated using (public.is_admin());

-- Managers only receive broad data access when the matching application permission is present.
create policy profiles_permission_select on public.profiles for select to authenticated
  using (public.current_user_role() = 'manager' and (public.has_permission('sales_team') or public.has_permission('reports')));
create policy customers_manager_permission on public.customers for all to authenticated
  using (public.current_user_role() = 'manager' and public.has_permission('customers'))
  with check (public.current_user_role() = 'manager' and public.has_permission('customers'));
create policy calls_manager_permission on public.call_histories for all to authenticated
  using (public.current_user_role() = 'manager' and public.has_permission('calls'))
  with check (public.current_user_role() = 'manager' and public.has_permission('calls'));
create policy followups_manager_permission on public.follow_ups for all to authenticated
  using (public.current_user_role() = 'manager' and public.has_permission('follow_ups'))
  with check (public.current_user_role() = 'manager' and public.has_permission('follow_ups'));
create policy activities_manager_permission on public.activities for select to authenticated
  using (public.current_user_role() = 'manager' and public.has_permission('reports'));
create policy settings_manager_permission on public.settings for all to authenticated
  using (public.current_user_role() = 'manager' and public.has_permission('settings'))
  with check (public.current_user_role() = 'manager' and public.has_permission('settings'));
