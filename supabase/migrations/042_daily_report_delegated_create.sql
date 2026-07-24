drop policy if exists daily_reports_create on public.daily_reports;
create policy daily_reports_create on public.daily_reports for insert to authenticated
with check (
  public.has_permission('daily_reports.create')
  and (
    sales_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.sales_teams team
      where team.id = sales_team_id
        and team.manager_id = auth.uid()
    )
  )
);

drop policy if exists daily_report_markets_access on public.daily_report_markets;
create policy daily_report_markets_access on public.daily_report_markets for all to authenticated
using (
  exists (
    select 1 from public.daily_reports report
    where report.id = daily_report_id
      and report.status in ('draft','returned')
      and (
        report.sales_user_id = auth.uid()
        or report.created_by = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1 from public.daily_reports report
    where report.id = daily_report_id
      and report.status in ('draft','returned')
      and (
        report.sales_user_id = auth.uid()
        or report.created_by = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists daily_report_expenses_access on public.daily_report_expenses;
create policy daily_report_expenses_access on public.daily_report_expenses for all to authenticated
using (
  exists (
    select 1 from public.daily_reports report
    where report.id = daily_report_id
      and report.status in ('draft','returned')
      and (
        report.sales_user_id = auth.uid()
        or report.created_by = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1 from public.daily_reports report
    where report.id = daily_report_id
      and report.status in ('draft','returned')
      and (
        report.sales_user_id = auth.uid()
        or report.created_by = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists daily_report_invoices_access on public.daily_report_invoices;
create policy daily_report_invoices_access on public.daily_report_invoices for all to authenticated
using (
  exists (
    select 1 from public.daily_reports report
    where report.id = daily_report_id
      and report.status in ('draft','returned')
      and (
        report.sales_user_id = auth.uid()
        or report.created_by = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1 from public.daily_reports report
    where report.id = daily_report_id
      and report.status in ('draft','returned')
      and (
        report.sales_user_id = auth.uid()
        or report.created_by = auth.uid()
        or public.is_admin()
      )
  )
);
