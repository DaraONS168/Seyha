alter table public.daily_reports
  add column if not exists work_start_time time,
  add column if not exists work_end_time time,
  add column if not exists night_check_time time,
  add column if not exists odometer_night numeric(12,2) check (odometer_night is null or odometer_night >= 0),
  add column if not exists after_hours_distance_km numeric(12,2) not null default 0 check (after_hours_distance_km >= 0),
  add column if not exists odometer_night_photo text;
