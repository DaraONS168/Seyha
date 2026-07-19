-- Field Visit Planning: district trips and customer stops.
create table public.visit_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 180),
  start_date date not null,
  end_date date not null,
  province text not null,
  district text not null,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  purpose text,
  transport text,
  status text not null default 'draft' check (status in ('draft','planned','in_progress','completed','cancelled')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.visit_plan_stops (
  id uuid primary key default gen_random_uuid(),
  visit_plan_id uuid not null references public.visit_plans(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  commune text,
  village text,
  address text,
  visit_at timestamptz not null,
  stop_order integer not null default 1 check (stop_order > 0),
  purpose text,
  result text,
  status text not null default 'pending' check (status in ('pending','visited','rescheduled','missed','cancelled')),
  latitude numeric(10,7) check (latitude is null or latitude between -90 and 90),
  longitude numeric(10,7) check (longitude is null or longitude between -180 and 180),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visit_plans_assigned_dates_idx on public.visit_plans(assigned_to,start_date,end_date);
create index visit_plans_status_idx on public.visit_plans(status,start_date);
create index visit_plans_location_idx on public.visit_plans(province,district);
create index visit_plan_stops_plan_order_idx on public.visit_plan_stops(visit_plan_id,stop_order,visit_at);
create index visit_plan_stops_customer_idx on public.visit_plan_stops(customer_id) where customer_id is not null;

create trigger visit_plans_updated_at before update on public.visit_plans
for each row execute function public.set_updated_at();
create trigger visit_plan_stops_updated_at before update on public.visit_plan_stops
for each row execute function public.set_updated_at();

create or replace function public.can_access_visit_plan(p_plan uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists(
    select 1 from public.visit_plans where id=p_plan and assigned_to=auth.uid()
  );
$$;

alter table public.visit_plans enable row level security;
alter table public.visit_plan_stops enable row level security;

create policy visit_plans_admin_all on public.visit_plans for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy visit_plans_sales_select on public.visit_plans for select to authenticated
using (assigned_to=auth.uid());
create policy visit_plans_sales_insert on public.visit_plans for insert to authenticated
with check (assigned_to=auth.uid() and created_by=auth.uid());
create policy visit_plans_sales_update on public.visit_plans for update to authenticated
using (assigned_to=auth.uid()) with check (assigned_to=auth.uid());

create policy visit_stops_admin_all on public.visit_plan_stops for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy visit_stops_sales_select on public.visit_plan_stops for select to authenticated
using (public.can_access_visit_plan(visit_plan_id));
create policy visit_stops_sales_insert on public.visit_plan_stops for insert to authenticated
with check (
  created_by=auth.uid() and public.can_access_visit_plan(visit_plan_id)
  and (customer_id is null or public.can_access_customer(customer_id))
);
create policy visit_stops_sales_update on public.visit_plan_stops for update to authenticated
using (public.can_access_visit_plan(visit_plan_id))
with check (public.can_access_visit_plan(visit_plan_id));
create policy visit_stops_sales_delete on public.visit_plan_stops for delete to authenticated
using (public.can_access_visit_plan(visit_plan_id));

grant execute on function public.can_access_visit_plan(uuid) to authenticated;
