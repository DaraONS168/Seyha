alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'manager', 'sales'));

alter table public.profiles add column if not exists permissions jsonb not null default '[]'::jsonb;

update public.profiles set permissions = case role
  when 'admin' then '["dashboard","customers","follow_ups","visit_plans","calls","reports","sales_team","notifications","settings","user_management"]'::jsonb
  when 'manager' then '["dashboard","customers","follow_ups","visit_plans","calls","reports","sales_team","notifications"]'::jsonb
  else '["dashboard","customers","follow_ups","visit_plans","calls","notifications"]'::jsonb
end where permissions = '[]'::jsonb;

create or replace function public.has_permission(permission_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and is_active
      and (role = 'admin' or permissions ? permission_name)
  );
$$;

grant execute on function public.has_permission(text) to authenticated;
