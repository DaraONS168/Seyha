-- Store detailed daily report workspace data: invoices and odometer/fuel summary.

alter table public.daily_reports
  add column if not exists odometer_start numeric(12,2) check (odometer_start is null or odometer_start >= 0),
  add column if not exists odometer_end numeric(12,2) check (odometer_end is null or odometer_end >= 0),
  add column if not exists total_distance_km numeric(12,2) not null default 0 check (total_distance_km >= 0),
  add column if not exists fuel_liters numeric(10,2) not null default 0 check (fuel_liters >= 0),
  add column if not exists fuel_unit_price numeric(12,2) not null default 0 check (fuel_unit_price >= 0),
  add column if not exists fuel_station text,
  add column if not exists fuel_invoice_number text,
  add column if not exists odometer_start_photo text,
  add column if not exists odometer_end_photo text,
  add column if not exists total_sales_amount numeric(14,2) not null default 0 check (total_sales_amount >= 0),
  add column if not exists total_collection_amount numeric(14,2) not null default 0 check (total_collection_amount >= 0),
  add column if not exists total_credit_amount numeric(14,2) not null default 0 check (total_credit_amount >= 0);

create table if not exists public.daily_report_invoices (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports(id) on delete cascade,
  invoice_number text not null,
  customer_name text not null,
  market_id uuid references public.markets(id),
  market_name text,
  invoice_amount numeric(14,2) not null default 0 check (invoice_amount >= 0),
  collected_amount numeric(14,2) not null default 0 check (collected_amount >= 0),
  credit_amount numeric(14,2) generated always as (greatest(invoice_amount - collected_amount, 0)) stored,
  status text not null default 'open' check (status in ('open','partial','paid','cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(daily_report_id, invoice_number)
);

create index if not exists daily_report_invoices_report_idx on public.daily_report_invoices(daily_report_id);
alter table public.daily_report_invoices enable row level security;

drop policy if exists daily_report_invoices_access on public.daily_report_invoices;
create policy daily_report_invoices_access on public.daily_report_invoices for all to authenticated
using(exists(select 1 from public.daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid() and r.status in('draft','returned')))
with check(exists(select 1 from public.daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid() and r.status in('draft','returned')));
drop policy if exists daily_report_invoices_owner_read on public.daily_report_invoices;
create policy daily_report_invoices_owner_read on public.daily_report_invoices for select to authenticated
using(exists(select 1 from public.daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid()));
drop policy if exists daily_report_invoices_review on public.daily_report_invoices;
create policy daily_report_invoices_review on public.daily_report_invoices for select to authenticated
using(exists(select 1 from public.daily_reports r where r.id=daily_report_id and (public.is_admin() or exists(select 1 from public.sales_teams t where t.id=r.sales_team_id and t.manager_id=auth.uid()))));

create or replace function public.recalculate_daily_report(p_report uuid) returns void language plpgsql security definer set search_path=public as $$
declare market_total integer;other_total numeric;fuel_total numeric;sales_total numeric;collection_total numeric;credit_total numeric;distance_total numeric;
begin
 select count(*) into market_total from daily_report_markets where daily_report_id=p_report;
 select coalesce(sum(e.amount),0) into other_total from daily_report_expenses e join expense_categories c on c.id=e.expense_category_id where e.daily_report_id=p_report and not c.is_fuel;
 select coalesce(sum(total_amount),0) into fuel_total from fuel_expenses where daily_report_id=p_report and deleted_at is null and status not in('rejected','cancelled');
 select coalesce(sum(invoice_amount),0),coalesce(sum(collected_amount),0),coalesce(sum(credit_amount),0) into sales_total,collection_total,credit_total from daily_report_invoices where daily_report_id=p_report and status<>'cancelled';
 select greatest(coalesce(odometer_end,0)-coalesce(odometer_start,0),0) into distance_total from daily_reports where id=p_report;
 update daily_reports set total_markets_visited=market_total,total_other_expense=other_total,total_fuel_expense=greatest(fuel_total,fuel_liters*fuel_unit_price),total_expense=other_total+greatest(fuel_total,fuel_liters*fuel_unit_price),total_sales_amount=sales_total,total_collection_amount=collection_total,total_credit_amount=credit_total,total_distance_km=distance_total,updated_at=now(),updated_by=auth.uid() where id=p_report;
end $$;

create or replace function public.daily_report_child_changed() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.recalculate_daily_report(coalesce(new.daily_report_id,old.daily_report_id));
  return coalesce(new,old);
end $$;

drop trigger if exists daily_report_invoices_totals on public.daily_report_invoices;
create trigger daily_report_invoices_totals after insert or update or delete on public.daily_report_invoices for each row execute function public.daily_report_child_changed();
