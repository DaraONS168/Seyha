-- Capture the actual fuel expense location coordinates.

alter table public.fuel_expenses
  add column latitude numeric(10,7) check (latitude between -90 and 90),
  add column longitude numeric(10,7) check (longitude between -180 and 180),
  add column google_map_url text;

create or replace function public.set_fuel_expense_map_url() returns trigger language plpgsql as $$
begin
  if new.latitude is null or new.longitude is null then raise exception 'Latitude and longitude are required'; end if;
  new.google_map_url:='https://www.google.com/maps?q='||new.latitude||','||new.longitude;
  return new;
end $$;
create trigger fuel_expenses_map_url before insert or update of latitude,longitude on public.fuel_expenses for each row execute function public.set_fuel_expense_map_url();
