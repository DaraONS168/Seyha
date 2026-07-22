-- Fuel expenses linked to Sales visit plans and provincial expense settlement.

create sequence if not exists public.fuel_expense_code_sequence start 1;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_code text not null unique,
  vehicle_type text not null,
  brand_model text not null,
  plate_number text not null unique,
  default_driver_id uuid references public.profiles(id) on delete set null,
  current_odometer numeric(12,2) not null default 0 check (current_odometer >= 0),
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fuel_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_code text not null unique,
  visit_expense_id uuid not null references public.expense_requests(id) on delete restrict,
  visit_plan_id uuid not null references public.visit_plans(id) on delete restrict,
  visit_location_id uuid references public.visit_plan_stops(id) on delete set null,
  sales_user_id uuid not null references public.profiles(id) on delete restrict,
  province_id bigint not null references public.provinces(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  driver_id uuid not null references public.profiles(id) on delete restrict,
  expense_date date not null,
  start_odometer numeric(12,2) not null check (start_odometer >= 0),
  end_odometer numeric(12,2) not null check (end_odometer > start_odometer),
  distance_km numeric(12,2) generated always as (end_odometer-start_odometer) stored,
  fuel_liters numeric(10,2) not null check (fuel_liters > 0),
  price_per_liter numeric(12,2) not null check (price_per_liter > 0),
  total_amount numeric(14,2) generated always as (fuel_liters*price_per_liter) stored,
  fuel_efficiency numeric(10,2) generated always as ((end_odometer-start_odometer)/fuel_liters) stored,
  cost_per_km numeric(12,2) generated always as ((fuel_liters*price_per_liter)/(end_odometer-start_odometer)) stored,
  currency text not null default 'KHR' check (currency in ('KHR','USD')),
  fuel_station text not null,
  invoice_number text not null,
  start_odometer_photo text not null,
  end_odometer_photo text not null,
  receipt_file text not null,
  note text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(fuel_station,invoice_number)
);

create index fuel_expenses_filters_idx on public.fuel_expenses(expense_date desc,sales_user_id,vehicle_id,province_id,status) where deleted_at is null;
create index fuel_expenses_plan_idx on public.fuel_expenses(visit_plan_id,visit_location_id);
create index fuel_expenses_vehicle_odometer_idx on public.fuel_expenses(vehicle_id,end_odometer desc) where deleted_at is null and status<>'rejected';
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger fuel_expenses_updated_at before update on public.fuel_expenses for each row execute function public.set_updated_at();

create or replace function public.prepare_fuel_expense() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_row public.visit_plans; request_row public.expense_requests; stop_plan_id uuid; latest_odometer numeric; vehicle_odometer numeric;
begin
  select * into plan_row from public.visit_plans where id=new.visit_plan_id;
  select * into request_row from public.expense_requests where id=new.visit_expense_id;
  if plan_row.id is null or request_row.id is null then raise exception 'Visit plan and expense request are required'; end if;
  if request_row.visit_plan_id is distinct from new.visit_plan_id then raise exception 'Expense request does not belong to selected visit plan'; end if;
  if new.expense_date<plan_row.start_date or new.expense_date>plan_row.end_date then raise exception 'Fuel expense date must be inside visit plan date range'; end if;
  new.sales_user_id:=plan_row.assigned_to;
  new.province_id:=request_row.province_id;
  if new.visit_location_id is not null then select visit_plan_id into stop_plan_id from public.visit_plan_stops where id=new.visit_location_id; if stop_plan_id is distinct from new.visit_plan_id then raise exception 'Visit location does not belong to plan'; end if; end if;
  select current_odometer into vehicle_odometer from public.vehicles where id=new.vehicle_id and status<>'inactive' for update;
  if vehicle_odometer is null then raise exception 'Vehicle is not available'; end if;
  select max(end_odometer) into latest_odometer from public.fuel_expenses where vehicle_id=new.vehicle_id and id<>new.id and deleted_at is null and status not in ('rejected','cancelled');
  latest_odometer:=greatest(coalesce(latest_odometer,0),vehicle_odometer);
  if new.start_odometer<latest_odometer then raise exception 'Start odometer cannot be less than latest odometer %',latest_odometer; end if;
  if tg_op='INSERT' then new.expense_code:='FUEL-'||extract(year from new.expense_date)::integer||'-'||lpad(nextval('public.fuel_expense_code_sequence')::text,6,'0');new.created_by:=auth.uid();
  else new.expense_code:=old.expense_code; if old.status not in ('draft','rejected') and row(new.start_odometer,new.end_odometer,new.fuel_liters,new.price_per_liter,new.invoice_number) is distinct from row(old.start_odometer,old.end_odometer,old.fuel_liters,old.price_per_liter,old.invoice_number) then raise exception 'Only draft or rejected fuel expense can be edited'; end if; end if;
  return new;
end $$;
create trigger fuel_expenses_prepare before insert or update on public.fuel_expenses for each row execute function public.prepare_fuel_expense();

create or replace function public.submit_fuel_expense(p_fuel_expense_id uuid) returns public.fuel_expenses language plpgsql security definer set search_path=public as $$
declare result public.fuel_expenses;
begin
  if not public.has_permission('fuel.submit') then raise exception 'Access denied'; end if;
  update public.fuel_expenses set status='submitted' where id=p_fuel_expense_id and created_by=auth.uid() and status in ('draft','rejected') and deleted_at is null returning * into result;
  if result.id is null then raise exception 'Fuel expense cannot be submitted'; end if;
  return result;
end $$;

create or replace function public.decide_fuel_expense(p_fuel_expense_id uuid,p_decision text,p_comment text default null) returns public.fuel_expenses language plpgsql security definer set search_path=public as $$
declare current_row public.fuel_expenses; result public.fuel_expenses;
begin
  if not public.has_permission('fuel.approve') then raise exception 'Access denied'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into current_row from public.fuel_expenses where id=p_fuel_expense_id and status='submitted' for update;
  if current_row.id is null then raise exception 'Fuel expense is not pending approval'; end if;
  if current_row.created_by=auth.uid() then raise exception 'Creator cannot approve own fuel expense'; end if;
  if p_decision='rejected' and char_length(trim(coalesce(p_comment,'')))<3 then raise exception 'Rejection comment is required'; end if;
  update public.fuel_expenses set status=p_decision,approved_by=case when p_decision='approved' then auth.uid() end,approved_at=case when p_decision='approved' then now() end,note=coalesce(nullif(trim(p_comment),''),note) where id=p_fuel_expense_id returning * into result;
  if p_decision='approved' then update public.vehicles set current_odometer=greatest(current_odometer,result.end_odometer) where id=result.vehicle_id; end if;
  return result;
end $$;

create or replace function public.sync_expense_actual() returns trigger language plpgsql security definer set search_path=public as $$
declare request_id uuid:=coalesce(new.expense_request_id,old.expense_request_id); item_total numeric; fuel_total numeric;
begin
  select coalesce(sum(amount),0) into item_total from public.expense_items where expense_request_id=request_id;
  select coalesce(sum(total_amount),0) into fuel_total from public.fuel_expenses where visit_expense_id=request_id and status='approved' and deleted_at is null;
  update public.expense_requests set actual_amount=item_total+fuel_total,returned_amount=greatest(amount_received-item_total-fuel_total,0),updated_by=auth.uid() where id=request_id and status<>'completed';
  return coalesce(new,old);
end $$;

create or replace function public.sync_fuel_expense_actual() returns trigger language plpgsql security definer set search_path=public as $$
declare request_id uuid:=coalesce(new.visit_expense_id,old.visit_expense_id); item_total numeric; fuel_total numeric;
begin
  select coalesce(sum(amount),0) into item_total from public.expense_items where expense_request_id=request_id;
  select coalesce(sum(total_amount),0) into fuel_total from public.fuel_expenses where visit_expense_id=request_id and status='approved' and deleted_at is null;
  update public.expense_requests set actual_amount=item_total+fuel_total,returned_amount=greatest(amount_received-item_total-fuel_total,0),updated_by=auth.uid() where id=request_id and status<>'completed';
  return coalesce(new,old);
end $$;
create trigger fuel_expenses_sync_actual after insert or update or delete on public.fuel_expenses for each row execute function public.sync_fuel_expense_actual();

create or replace view public.fuel_expense_dashboard with (security_invoker=true) as
select coalesce(sum(total_amount) filter(where status='approved'),0) as total_fuel_expense,
  coalesce(sum(distance_km) filter(where status='approved'),0) as total_distance_km,
  coalesce(sum(fuel_liters) filter(where status='approved'),0) as total_liters,
  coalesce(sum(distance_km) filter(where status='approved')/nullif(sum(fuel_liters) filter(where status='approved'),0),0) as average_efficiency,
  count(*) filter(where status='submitted') as pending_count
from public.fuel_expenses where deleted_at is null;

insert into public.app_roles(key,name,permissions,is_system) values('fuel_reviewer','Fuel Expense Reviewer','["expenses.view","fuel.view","fuel.approve","fuel.reports","notifications"]',true) on conflict(key) do update set permissions=excluded.permissions;
update public.app_roles set permissions=permissions||'["fuel.view","fuel.create","fuel.submit"]'::jsonb where key in ('sales','expense_requester');
update public.app_roles set permissions=permissions||'["fuel.view","fuel.approve","fuel.reports","vehicles.manage"]'::jsonb where key='admin';
update public.profiles profile set permissions=role.permissions,updated_at=now() from public.app_roles role where profile.role=role.key and profile.permissions is distinct from role.permissions;

alter table public.vehicles enable row level security;alter table public.fuel_expenses enable row level security;
create policy vehicles_read on public.vehicles for select to authenticated using(public.has_permission('fuel.view'));
create policy vehicles_manage on public.vehicles for all to authenticated using(public.has_permission('vehicles.manage')) with check(public.has_permission('vehicles.manage'));
create policy fuel_expenses_read on public.fuel_expenses for select to authenticated using(public.has_permission('fuel.view') and (public.has_permission('fuel.approve') or sales_user_id=auth.uid() or created_by=auth.uid()));
create policy fuel_expenses_create on public.fuel_expenses for insert to authenticated with check(public.has_permission('fuel.create') and created_by=auth.uid() and sales_user_id=auth.uid());
create policy fuel_expenses_edit on public.fuel_expenses for update to authenticated using(created_by=auth.uid() and status in ('draft','rejected')) with check(created_by=auth.uid());
grant execute on function public.submit_fuel_expense(uuid) to authenticated;
grant execute on function public.decide_fuel_expense(uuid,text,text) to authenticated;
grant select on public.fuel_expense_dashboard to authenticated;
