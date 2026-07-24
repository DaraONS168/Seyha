create or replace function public.recalculate_daily_report(p_report uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  market_total integer;
  sales_total numeric(14,2);
  collection_total numeric(14,2);
  credit_total numeric(14,2);
  other_total numeric(14,2);
  fuel_total numeric(14,2);
  distance_total numeric(10,2);
begin
  select coalesce(count(*), 0)
    into market_total
  from daily_report_invoices
  where daily_report_id = p_report
    and status <> 'cancelled';

  if market_total = 0 then
    select coalesce(count(*), 0)
      into market_total
    from daily_report_markets
    where daily_report_id = p_report;
  end if;

  select
    coalesce(sum(invoice_amount), 0),
    coalesce(sum(collected_amount), 0),
    coalesce(sum(credit_amount), 0)
    into sales_total, collection_total, credit_total
  from daily_report_invoices
  where daily_report_id = p_report
    and status <> 'cancelled';

  select coalesce(sum(amount), 0)
    into other_total
  from daily_report_expenses
  where daily_report_id = p_report;

  select greatest(
      coalesce(total_fuel_expense, 0),
      coalesce(fuel_liters, 0) * coalesce(fuel_unit_price, 0)
    )
    into fuel_total
  from daily_reports
  where id = p_report;

  select greatest(coalesce(odometer_end, 0) - coalesce(odometer_start, 0), 0)
    into distance_total
  from daily_reports
  where id = p_report;

  update daily_reports
  set
    total_markets_visited = market_total,
    total_sales_amount = sales_total,
    total_collection_amount = collection_total,
    total_credit_amount = credit_total,
    total_other_expense = other_total,
    total_fuel_expense = fuel_total,
    total_expense = other_total + fuel_total,
    total_distance_km = distance_total,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_report;
end;
$$;
