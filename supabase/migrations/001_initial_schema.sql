-- Customer Follow Up Management System - Supabase/PostgreSQL schema
-- Run in a new Supabase project through SQL Editor or `supabase db push`.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  role text not null default 'sales' check (role in ('admin','sales')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 150),
  phone text not null check (phone ~ '^(\\+?855|0)[1-9][0-9]{7,8}$'),
  alternative_phone text check (alternative_phone is null or alternative_phone ~ '^(\\+?855|0)[1-9][0-9]{7,8}$'),
  gender text check (gender is null or gender in ('male','female','other')),
  province text,
  source text not null default 'other' check (source in ('facebook','telegram','tiktok','website','referral','walk_in','other')),
  interested_product text,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'new_lead' check (status in ('new_lead','pending_follow_up','contacted','interested','not_interested','no_answer','call_back_later','converted','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  next_follow_up_at timestamptz,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_phone_normalized_uidx on public.customers ((regexp_replace(phone, '[^0-9+]', '', 'g')));
create index customers_assigned_to_idx on public.customers(assigned_to);
create index customers_status_idx on public.customers(status);
create index customers_priority_idx on public.customers(priority);
create index customers_follow_up_idx on public.customers(next_follow_up_at) where next_follow_up_at is not null;
create index customers_created_at_idx on public.customers(created_at desc);

create table public.call_histories (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  called_by uuid not null references public.profiles(id) on delete restrict,
  call_result text not null check (call_result in ('answered','no_answer','busy','wrong_number','interested','not_interested','call_back_later','converted')),
  call_duration integer not null default 0 check (call_duration >= 0),
  notes text,
  next_follow_up_at timestamptz,
  called_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index call_histories_customer_idx on public.call_histories(customer_id, called_at desc);
create index call_histories_called_by_idx on public.call_histories(called_by, called_at desc);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  follow_up_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  notes text,
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);
create index follow_ups_assigned_due_idx on public.follow_ups(assigned_to, status, follow_up_at);
create index follow_ups_customer_idx on public.follow_ups(customer_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null default 'follow_up' check (notification_type in ('follow_up','assignment','system')),
  is_read boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read, created_at desc);
create unique index notifications_due_once_uidx on public.notifications(user_id, customer_id, ((message))) where notification_type = 'follow_up';

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  activity_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);
create index activities_customer_idx on public.activities(customer_id, created_at desc);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_logo text,
  company_phone text,
  company_address text,
  reminder_minutes integer not null default 30 check (reminder_minutes between 0 and 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger follow_ups_updated_at before update on public.follow_ups for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, 'sales');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_access_customer(p_customer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists(select 1 from public.customers where id=p_customer and assigned_to=auth.uid());
$$;

create or replace function public.customer_follow_up_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.next_follow_up_at is not null
     and (tg_op = 'INSERT' or old.next_follow_up_at is distinct from new.next_follow_up_at)
     and new.status not in ('converted','cancelled') then
    update public.follow_ups set status='cancelled', updated_at=now()
      where customer_id=new.id and status='pending';
    insert into public.follow_ups(customer_id,assigned_to,follow_up_at,status,created_by,notes)
      values(new.id,coalesce(new.assigned_to,new.created_by),new.next_follow_up_at,'pending',coalesce(auth.uid(),new.created_by),'Created from customer next follow-up');
  end if;
  if new.status in ('converted','cancelled') then
    update public.follow_ups set status='cancelled', updated_at=now()
      where customer_id=new.id and status='pending';
  end if;
  return new;
end $$;
create trigger customer_follow_up_sync after insert or update of next_follow_up_at,status on public.customers for each row execute function public.customer_follow_up_changed();

create or replace function public.log_customer_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(auth.uid(), new.created_by);
begin
  insert into public.activities(customer_id,user_id,activity_type,description)
  values(new.id,uid,case when tg_op='INSERT' then 'customer_created' else 'customer_updated' end,
    case when tg_op='INSERT' then 'បានបង្កើតអតិថិជន' else 'បានកែប្រែព័ត៌មានអតិថិជន' end);
  return new;
end $$;
create trigger customer_activity after insert or update on public.customers for each row execute function public.log_customer_activity();

create or replace function public.record_customer_call(
  p_customer_id uuid, p_result text, p_duration integer default 0, p_notes text default null,
  p_next_follow_up_at timestamptz default null, p_customer_status text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare call_id uuid; assignee uuid;
begin
  if not public.can_access_customer(p_customer_id) then raise exception 'Access denied'; end if;
  select assigned_to into assignee from public.customers where id=p_customer_id for update;
  insert into public.call_histories(customer_id,called_by,call_result,call_duration,notes,next_follow_up_at)
    values(p_customer_id,auth.uid(),p_result,greatest(coalesce(p_duration,0),0),nullif(trim(p_notes),''),p_next_follow_up_at)
    returning id into call_id;
  update public.customers set
    status=coalesce(p_customer_status,status), next_follow_up_at=coalesce(p_next_follow_up_at,next_follow_up_at)
    where id=p_customer_id;
  insert into public.activities(customer_id,user_id,activity_type,description)
    values(p_customer_id,auth.uid(),'call_recorded','បានកត់ត្រាការហៅ: '||p_result);
  return call_id;
end $$;

create or replace function public.sync_due_notifications() returns integer
language plpgsql security invoker set search_path = public as $$
declare inserted_count integer;
begin
  insert into public.notifications(user_id,customer_id,title,message,notification_type)
  select f.assigned_to,f.customer_id,'ដល់ពេល Follow Up',
    'ដល់ពេល Follow Up ជាមួយ '||c.name||' នៅ '||to_char(f.follow_up_at,'DD/MM/YYYY HH24:MI'),'follow_up'
  from public.follow_ups f join public.customers c on c.id=f.customer_id
  where f.assigned_to=auth.uid() and f.status='pending' and f.follow_up_at<=now()
    and c.status not in ('converted','cancelled')
    and not exists(select 1 from public.notifications n where n.user_id=f.assigned_to and n.customer_id=f.customer_id and n.notification_type='follow_up' and n.message like '%'||to_char(f.follow_up_at,'DD/MM/YYYY HH24:MI'));
  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.call_histories enable row level security;
alter table public.follow_ups enable row level security;
alter table public.notifications enable row level security;
alter table public.activities enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid() and role=public.current_user_role());

create policy customers_admin_all on public.customers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy customers_sales_select on public.customers for select to authenticated using (assigned_to=auth.uid());
create policy customers_sales_insert on public.customers for insert to authenticated with check (assigned_to=auth.uid() and created_by=auth.uid());
create policy customers_sales_update on public.customers for update to authenticated using (assigned_to=auth.uid()) with check (assigned_to=auth.uid());

create policy calls_admin_all on public.call_histories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy calls_sales_select on public.call_histories for select to authenticated using (public.can_access_customer(customer_id));
create policy calls_sales_insert on public.call_histories for insert to authenticated with check (called_by=auth.uid() and public.can_access_customer(customer_id));

create policy followups_admin_all on public.follow_ups for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy followups_sales_select on public.follow_ups for select to authenticated using (assigned_to=auth.uid());
create policy followups_sales_insert on public.follow_ups for insert to authenticated with check (assigned_to=auth.uid() and created_by=auth.uid());
create policy followups_sales_update on public.follow_ups for update to authenticated using (assigned_to=auth.uid()) with check (assigned_to=auth.uid());

create policy notifications_admin_all on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy notifications_own_select on public.notifications for select to authenticated using (user_id=auth.uid());
create policy notifications_own_insert on public.notifications for insert to authenticated with check (user_id=auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy activities_admin_all on public.activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy activities_sales_select on public.activities for select to authenticated using (public.can_access_customer(customer_id));
create policy activities_sales_insert on public.activities for insert to authenticated with check (user_id=auth.uid() and public.can_access_customer(customer_id));

create policy products_read on public.products for select to authenticated using (true);
create policy products_admin_write on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_admin_write on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_access_customer(uuid) to authenticated;
grant execute on function public.record_customer_call(uuid,text,integer,text,timestamptz,text) to authenticated;
grant execute on function public.sync_due_notifications() to authenticated;

insert into public.products(name,description) values
  ('CRM Setup','ការដំឡើង និងរៀបចំប្រព័ន្ធ CRM'),
  ('Digital Marketing','សេវាកម្មទីផ្សារឌីជីថល'),
  ('Website Development','សេវាកម្មបង្កើតវេបសាយ')
on conflict (name) do nothing;
insert into public.settings(company_name,company_phone,company_address,reminder_minutes)
select 'Demo Company','012 345 678','Phnom Penh, Cambodia',30
where not exists(select 1 from public.settings);
