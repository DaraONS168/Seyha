-- Market governance: granular permissions, geographic scope, workflows and stalls.

alter table public.profiles add column if not exists province_id bigint references public.provinces(id) on delete set null;
alter table public.profiles add column if not exists district_id bigint references public.districts(id) on delete set null;

alter table public.provinces add column if not exists source text not null default 'NCDD Gazetteer';
alter table public.provinces add column if not exists source_updated_at timestamptz;
alter table public.provinces add column if not exists effective_date date;
alter table public.districts add column if not exists source text not null default 'NCDD Gazetteer';
alter table public.districts add column if not exists source_updated_at timestamptz;
alter table public.districts add column if not exists effective_date date;
alter table public.communes add column if not exists source text not null default 'NCDD Gazetteer';
alter table public.communes add column if not exists source_updated_at timestamptz;
alter table public.communes add column if not exists effective_date date;
alter table public.villages add column if not exists source text not null default 'NCDD Gazetteer';
alter table public.villages add column if not exists source_updated_at timestamptz;
alter table public.villages add column if not exists effective_date date;

create table public.market_status_histories (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  old_status text,
  new_status text not null check (new_status in ('active','inactive','under_construction','closed')),
  reason text,
  reference_document text,
  effective_date date not null default current_date,
  changed_by uuid references public.profiles(id) on delete set null default auth.uid(),
  changed_at timestamptz not null default now(),
  check (new_status not in ('inactive','closed') or char_length(trim(reason)) >= 3)
);

create table public.market_stalls (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  stall_code text not null,
  zone text,
  building text,
  floor text,
  status text not null default 'available' check (status in ('available','occupied','reserved','closed')),
  trader_name text,
  trader_phone text check (trader_phone is null or trader_phone ~ '^(\\+?855|0)[1-9][0-9]{7,8}$'),
  rental_fee numeric(12,2) check (rental_fee is null or rental_fee >= 0),
  contract_start date,
  contract_end date,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','overdue')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(market_id, stall_code),
  check (contract_end is null or contract_start is null or contract_end >= contract_start)
);

create table public.market_import_logs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  failed_rows integer not null default 0,
  error_details jsonb not null default '[]'::jsonb,
  imported_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index market_status_history_idx on public.market_status_histories(market_id, changed_at desc);
create index market_stalls_market_idx on public.market_stalls(market_id, status, stall_code);
create index market_import_logs_created_idx on public.market_import_logs(created_at desc);
create trigger market_stalls_updated_at before update on public.market_stalls for each row execute function public.set_updated_at();

create or replace function public.sync_market_stall_counts() returns trigger
language plpgsql security definer set search_path = public as $$
declare target_market uuid := coalesce(new.market_id, old.market_id);
begin
  update public.markets market set
    total_stalls = (select count(*) from public.market_stalls where market_id = target_market),
    occupied_stalls = (select count(*) from public.market_stalls where market_id = target_market and status = 'occupied'),
    trader_count = (select count(*) from public.market_stalls where market_id = target_market and status = 'occupied' and trader_name is not null)
  where market.id = target_market;
  if tg_op = 'UPDATE' and old.market_id is distinct from new.market_id then
    update public.markets market set
      total_stalls = (select count(*) from public.market_stalls where market_id = old.market_id),
      occupied_stalls = (select count(*) from public.market_stalls where market_id = old.market_id and status = 'occupied'),
      trader_count = (select count(*) from public.market_stalls where market_id = old.market_id and status = 'occupied' and trader_name is not null)
    where market.id = old.market_id;
  end if;
  return coalesce(new, old);
end $$;
create trigger market_stalls_sync_counts after insert or update or delete on public.market_stalls for each row execute function public.sync_market_stall_counts();

create or replace function public.market_scope_allows(p_province_id bigint, p_district_id bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_active
      and (profile.role = 'admin' or profile.province_id is null or profile.province_id = p_province_id)
      and (profile.role = 'admin' or profile.district_id is null or profile.district_id = p_district_id)
  );
$$;

create or replace function public.can_access_market(p_market_id uuid, p_permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_permission(p_permission) and exists(
    select 1 from public.markets market
    where market.id = p_market_id and public.market_scope_allows(market.province_id, market.district_id)
  );
$$;

create or replace function public.change_market_status(
  p_market_id uuid, p_status text, p_reason text default null,
  p_effective_date date default current_date, p_reference_document text default null
) returns public.markets
language plpgsql security definer set search_path = public as $$
declare current_market public.markets; updated_market public.markets;
begin
  if not public.can_access_market(p_market_id, 'markets.update') then raise exception 'Access denied'; end if;
  if p_status not in ('active','inactive','under_construction','closed') then raise exception 'Invalid market status'; end if;
  if p_status in ('inactive','closed') and char_length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Reason is required'; end if;
  select * into current_market from public.markets where id = p_market_id for update;
  if current_market.status = p_status then return current_market; end if;
  perform set_config('app.market_status_change', 'allowed', true);
  update public.markets set status = p_status, updated_by = auth.uid() where id = p_market_id returning * into updated_market;
  insert into public.market_status_histories(market_id,old_status,new_status,reason,effective_date,reference_document,changed_by)
  values(p_market_id,current_market.status,p_status,nullif(trim(p_reason),''),coalesce(p_effective_date,current_date),nullif(trim(p_reference_document),''),auth.uid());
  return updated_market;
end $$;

create or replace function public.protect_market_status() returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status and current_setting('app.market_status_change', true) is distinct from 'allowed' then
    raise exception 'Use change_market_status to update market status';
  end if;
  return new;
end $$;
create trigger markets_protect_status before update of status on public.markets for each row execute function public.protect_market_status();

create or replace function public.soft_delete_market(p_market_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access_market(p_market_id, 'markets.delete') then raise exception 'Access denied'; end if;
  update public.markets set deleted_at = now(), deleted_by = auth.uid(), updated_by = auth.uid() where id = p_market_id and deleted_at is null;
end $$;

create or replace function public.restore_market(p_market_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access_market(p_market_id, 'markets.restore') then raise exception 'Access denied'; end if;
  update public.markets set deleted_at = null, deleted_by = null, updated_by = auth.uid() where id = p_market_id and deleted_at is not null;
end $$;

create or replace function public.prevent_duplicate_market() returns trigger language plpgsql as $$
begin
  if exists(select 1 from public.markets where commune_id = new.commune_id and lower(trim(name_kh)) = lower(trim(new.name_kh)) and deleted_at is null and id <> new.id) then
    raise exception 'A market with this name already exists in the selected commune';
  end if;
  return new;
end $$;
create trigger markets_prevent_duplicate before insert or update of name_kh,commune_id on public.markets for each row execute function public.prevent_duplicate_market();

drop policy if exists markets_permission_select on public.markets;
drop policy if exists markets_permission_insert on public.markets;
drop policy if exists markets_permission_update on public.markets;
drop policy if exists market_audit_permission_select on public.market_audit_logs;
create policy markets_scoped_select on public.markets for select to authenticated using (public.has_permission('markets.view') and public.market_scope_allows(province_id,district_id));
create policy markets_scoped_insert on public.markets for insert to authenticated with check (public.has_permission('markets.create') and public.market_scope_allows(province_id,district_id) and created_by = auth.uid());
create policy markets_scoped_update on public.markets for update to authenticated using (public.has_permission('markets.update') and public.market_scope_allows(province_id,district_id)) with check (public.has_permission('markets.update') and public.market_scope_allows(province_id,district_id));
create policy market_audit_scoped_select on public.market_audit_logs for select to authenticated using (public.has_permission('markets.view_audit') and public.can_access_market(market_id,'markets.view'));

alter table public.market_status_histories enable row level security;
alter table public.market_stalls enable row level security;
alter table public.market_import_logs enable row level security;
create policy market_status_scoped_read on public.market_status_histories for select to authenticated using (public.can_access_market(market_id,'markets.view'));
create policy market_stalls_scoped_read on public.market_stalls for select to authenticated using (public.can_access_market(market_id,'markets.view'));
create policy market_stalls_scoped_insert on public.market_stalls for insert to authenticated with check (public.can_access_market(market_id,'markets.update'));
create policy market_stalls_scoped_update on public.market_stalls for update to authenticated using (public.can_access_market(market_id,'markets.update')) with check (public.can_access_market(market_id,'markets.update'));
create policy market_stalls_scoped_delete on public.market_stalls for delete to authenticated using (public.can_access_market(market_id,'markets.update'));
create policy market_import_log_insert on public.market_import_logs for insert to authenticated with check (public.has_permission('markets.import') and imported_by = auth.uid());
create policy market_import_log_read on public.market_import_logs for select to authenticated using (public.has_permission('markets.import'));

update public.app_roles set permissions = (permissions - 'markets') || '["markets.view","markets.create","markets.update","markets.delete","markets.restore","markets.import","markets.export","markets.view_audit"]'::jsonb
where permissions ? 'markets';

grant execute on function public.market_scope_allows(bigint,bigint) to authenticated;
grant execute on function public.can_access_market(uuid,text) to authenticated;
grant execute on function public.change_market_status(uuid,text,text,date,text) to authenticated;
grant execute on function public.soft_delete_market(uuid) to authenticated;
grant execute on function public.restore_market(uuid) to authenticated;
