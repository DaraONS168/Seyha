drop policy if exists daily_reports_update on public.daily_reports;
create policy daily_reports_update on public.daily_reports for update to authenticated
using (
  public.has_permission('daily_reports.update')
  and status in ('draft','returned')
  and (
    sales_user_id = auth.uid()
    or created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.sales_teams team
      where team.id = sales_team_id
        and team.manager_id = auth.uid()
    )
  )
)
with check (
  public.has_permission('daily_reports.update')
  and (
    sales_user_id = auth.uid()
    or created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.sales_teams team
      where team.id = sales_team_id
        and team.manager_id = auth.uid()
    )
  )
);
