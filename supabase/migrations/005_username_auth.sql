-- Add usernames while keeping Supabase's email/password provider internally.
alter table public.profiles add column if not exists username text;

update public.profiles
set username = lower(split_part(email, '@', 1))
where username is null;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

alter table public.profiles
  add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-z0-9._-]{3,30}$') not valid;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, username, role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1))),
    'sales'
  );
  return new;
end $$;
