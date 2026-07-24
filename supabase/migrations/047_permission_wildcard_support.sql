create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.is_active = true
      and (
        profile.role = 'admin'
        or profile.permissions ? permission_name
        or profile.permissions ? (split_part(permission_name, '.', 1) || '.*')
        or (
          position('.' in permission_name) > 0
          and profile.permissions ? (substring(permission_name from 1 for length(permission_name) - length(split_part(reverse(permission_name), '.', 1)) - 1) || '.*')
        )
      )
  );
$$;

update public.app_roles
set permissions = (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
  from (
    select distinct value
    from jsonb_array_elements_text(
      permissions || '[
        "dashboard.*","notifications.*","customers.*","follow_ups.*","visit_plans.*","calls.*",
        "reports.*","sales_team.*","markets.*","expenses.*","expenses.budgets.*",
        "fuel.*","fuel.budgets.*","vehicles.*","daily_reports.*","users.*","settings.*"
      ]'::jsonb
    )
  ) unique_permissions
)
where key = 'admin';

update public.profiles profile
set permissions = role.permissions,
    updated_at = now()
from public.app_roles role
where profile.role = role.key
  and role.key = 'admin'
  and profile.permissions is distinct from role.permissions;
