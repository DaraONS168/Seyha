-- Keep the denormalized profile permission cache aligned with app_roles for RLS.
update public.profiles profile
set permissions = role.permissions,
    updated_at = now()
from public.app_roles role
where profile.role = role.key
  and profile.permissions is distinct from role.permissions;
