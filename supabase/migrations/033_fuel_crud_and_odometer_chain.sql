-- Apply standardized CRUD permissions to vehicles and fuel expenses.
drop policy if exists vehicles_manage on public.vehicles;
create policy vehicles_permission_insert on public.vehicles for insert to authenticated with check(public.has_permission('vehicles.create'));
create policy vehicles_permission_update on public.vehicles for update to authenticated using(public.has_permission('vehicles.update')) with check(public.has_permission('vehicles.update'));
create policy vehicles_permission_delete on public.vehicles for delete to authenticated using(public.has_permission('vehicles.delete'));

drop policy if exists fuel_expenses_edit on public.fuel_expenses;
create policy fuel_expenses_permission_update on public.fuel_expenses for update to authenticated
  using(public.has_permission('fuel.update') and created_by=auth.uid() and status in ('draft','rejected'))
  with check(public.has_permission('fuel.update') and created_by=auth.uid());
create policy fuel_expenses_permission_delete on public.fuel_expenses for delete to authenticated
  using(public.has_permission('fuel.delete') and created_by=auth.uid() and status in ('draft','rejected'));

create index if not exists fuel_expenses_sales_vehicle_odometer_idx
  on public.fuel_expenses(sales_user_id,vehicle_id,end_odometer desc)
  where deleted_at is null and status not in ('rejected','cancelled');
