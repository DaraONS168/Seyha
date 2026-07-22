-- Select fuel expense location from Market Management lookup data.

alter table public.fuel_expenses
  add column market_id uuid references public.markets(id) on delete restrict,
  add column district_id bigint references public.districts(id) on delete restrict;

create index fuel_expenses_market_idx on public.fuel_expenses(market_id, province_id, district_id);

create or replace function public.prepare_fuel_expense() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_row public.visit_plans; request_row public.expense_requests; market_row public.markets; latest_odometer numeric; vehicle_odometer numeric;
begin
  select * into plan_row from public.visit_plans where id=new.visit_plan_id;
  select * into request_row from public.expense_requests where id=new.visit_expense_id;
  if plan_row.id is null or request_row.id is null then raise exception 'Visit plan and expense request are required'; end if;
  if request_row.visit_plan_id is distinct from new.visit_plan_id then raise exception 'Expense request does not belong to selected visit plan'; end if;
  if new.expense_date<plan_row.start_date or new.expense_date>plan_row.end_date then raise exception 'Fuel expense date must be inside visit plan date range'; end if;
  new.sales_user_id:=plan_row.assigned_to;
  if new.market_id is not null then
    select * into market_row from public.markets where id=new.market_id and deleted_at is null and status='active';
    if market_row.id is null then raise exception 'Selected market is not available'; end if;
    if market_row.province_id is distinct from request_row.province_id then raise exception 'Selected market must be in the expense request province'; end if;
    new.province_id:=market_row.province_id; new.district_id:=market_row.district_id;
  else
    new.province_id:=request_row.province_id;
  end if;
  new.visit_location_id:=null;
  select current_odometer into vehicle_odometer from public.vehicles where id=new.vehicle_id and status<>'inactive' for update;
  if vehicle_odometer is null then raise exception 'Vehicle is not available'; end if;
  select max(end_odometer) into latest_odometer from public.fuel_expenses where vehicle_id=new.vehicle_id and id<>new.id and deleted_at is null and status not in ('rejected','cancelled');
  latest_odometer:=greatest(coalesce(latest_odometer,0),vehicle_odometer);
  if new.start_odometer<latest_odometer then raise exception 'Start odometer cannot be less than latest odometer %',latest_odometer; end if;
  if tg_op='INSERT' then new.expense_code:='FUEL-'||extract(year from new.expense_date)::integer||'-'||lpad(nextval('public.fuel_expense_code_sequence')::text,6,'0');new.created_by:=auth.uid();
  else new.expense_code:=old.expense_code; if old.status not in ('draft','rejected') and row(new.start_odometer,new.end_odometer,new.fuel_liters,new.price_per_liter,new.invoice_number,new.market_id) is distinct from row(old.start_odometer,old.end_odometer,old.fuel_liters,old.price_per_liter,old.invoice_number,old.market_id) then raise exception 'Only draft or rejected fuel expense can be edited'; end if; end if;
  return new;
end $$;

drop policy if exists markets_fuel_location_select on public.markets;
create policy markets_fuel_location_select on public.markets for select to authenticated
using(public.has_permission('fuel.view') and deleted_at is null and public.market_scope_allows(province_id,district_id));
