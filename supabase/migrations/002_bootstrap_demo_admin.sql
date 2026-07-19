-- Bootstrap the requested demo administrator after public Auth signup.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where id = 'fe4bf348-ca03-4bba-9681-b4f89046b16f'
  and email = 'admin@demo.com';

update public.profiles
set full_name = 'ShadowPV Administrator', role = 'admin', is_active = true
where id = 'fe4bf348-ca03-4bba-9681-b4f89046b16f'
  and email = 'admin@demo.com';
