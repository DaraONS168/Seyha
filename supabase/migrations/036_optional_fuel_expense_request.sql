-- Allow fuel expenses to deduct directly from a Sales Visit Plan budget without a linked expense request.

alter table public.fuel_expenses
  alter column visit_expense_id drop not null;

create or replace function public.prepare_fuel_expense() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_row public.visit_plans; request_row public.expense_requests; district_province_id bigint; latest_odometer numeric; vehicle_odometer numeric;
begin
  select * into plan_row from public.visit_plans where id=new.visit_plan_id;
  if plan_row.id is null then raise exception 'Visit plan is required'; end if;
  if plan_row.status='cancelled' then raise exception 'Cancelled visit plan cannot be used for fuel expense'; end if;

  if new.visit_expense_id is not null then
    select * into request_row from public.expense_requests where id=new.visit_expense_id and deleted_at is null;
    if request_row.id is null then raise exception 'Expense request is not available'; end if;
    if request_row.visit_plan_id is distinct from new.visit_plan_id then raise exception 'Expense request does not belong to selected visit plan'; end if;
  end if;

  if new.expense_date<plan_row.start_date or new.expense_date>plan_row.end_date then raise exception 'Fuel expense date must be inside visit plan date range'; end if;
  new.sales_user_id:=plan_row.assigned_to;
  select province_id into district_province_id from public.districts where id=new.district_id and is_active;
  if new.province_id is null or new.district_id is null or district_province_id is distinct from new.province_id then raise exception 'Invalid province or district relationship'; end if;
  new.market_id:=null; new.visit_location_id:=null;

  select current_odometer into vehicle_odometer from public.vehicles where id=new.vehicle_id and status<>'inactive' for update;
  if vehicle_odometer is null then raise exception 'Vehicle is not available'; end if;
  select max(end_odometer) into latest_odometer from public.fuel_expenses where vehicle_id=new.vehicle_id and id<>new.id and deleted_at is null and status not in ('rejected','cancelled');
  latest_odometer:=greatest(coalesce(latest_odometer,0),vehicle_odometer);
  if new.start_odometer<latest_odometer then raise exception 'Start odometer cannot be less than latest odometer %',latest_odometer; end if;

  if tg_op='INSERT' then
    new.expense_code:='FUEL-'||extract(year from new.expense_date)::integer||'-'||lpad(nextval('public.fuel_expense_code_sequence')::text,6,'0');
    new.created_by:=auth.uid();
  else
    new.expense_code:=old.expense_code;
    if old.status not in ('draft','rejected') and row(new.start_odometer,new.end_odometer,new.fuel_liters,new.price_per_liter,new.invoice_number,new.province_id,new.district_id) is distinct from row(old.start_odometer,old.end_odometer,old.fuel_liters,old.price_per_liter,old.invoice_number,old.province_id,old.district_id) then
      raise exception 'Only draft or rejected fuel expense can be edited';
    end if;
  end if;
  return new;
end $$;

create or replace function public.sync_fuel_expense_actual() returns trigger language plpgsql security definer set search_path=public as $$
declare request_id uuid:=coalesce(new.visit_expense_id,old.visit_expense_id); item_total numeric; fuel_total numeric;
begin
  if request_id is null then return coalesce(new,old); end if;
  select coalesce(sum(amount),0) into item_total from public.expense_items where expense_request_id=request_id;
  select coalesce(sum(total_amount),0) into fuel_total from public.fuel_expenses where visit_expense_id=request_id and status='approved' and deleted_at is null;
  update public.expense_requests set actual_amount=item_total+fuel_total,returned_amount=greatest(amount_received-item_total-fuel_total,0),updated_by=auth.uid() where id=request_id and status<>'completed';
  return coalesce(new,old);
end $$;
