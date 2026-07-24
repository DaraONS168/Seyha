alter table public.daily_report_invoices
  add column if not exists returned_amount numeric(14,2) not null default 0 check (returned_amount >= 0);

alter table public.daily_report_invoices
  drop column if exists credit_amount;

alter table public.daily_report_invoices
  add column credit_amount numeric(14,2) generated always as (greatest(invoice_amount - collected_amount - returned_amount, 0)) stored;

create or replace function public.recalculate_daily_report(p_report uuid) returns void language plpgsql security definer set search_path=public as $$
declare
  sales_total numeric(14,2);
  collection_total numeric(14,2);
  credit_total numeric(14,2);
  expense_total numeric(14,2);
begin
  select coalesce(sum(invoice_amount),0),coalesce(sum(collected_amount),0),coalesce(sum(credit_amount),0) into sales_total,collection_total,credit_total from daily_report_invoices where daily_report_id=p_report and status<>'cancelled';
  select coalesce(sum(amount),0) into expense_total from daily_report_expenses where daily_report_id=p_report;
  update daily_reports set total_sales_amount=sales_total,total_collection_amount=collection_total,total_credit_amount=credit_total,total_expense_amount=expense_total,updated_at=now() where id=p_report;
end $$;
