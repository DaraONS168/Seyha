create or replace function public.submit_daily_report(p_report uuid) returns daily_reports
language plpgsql
security definer
set search_path=public
as $$
declare
  r daily_reports;
  old text;
begin
  select * into r
  from daily_reports
  where id = p_report and deleted_at is null
  for update;

  if r.id is null then
    raise exception 'Report not found';
  end if;

  if r.status not in ('draft','returned') then
    raise exception 'Report cannot be submitted';
  end if;

  if not (
    r.sales_user_id = auth.uid()
    or r.created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.sales_teams team
      where team.id = r.sales_team_id
        and team.manager_id = auth.uid()
    )
  ) then
    raise exception 'Report cannot be submitted';
  end if;

  if not exists(select 1 from daily_report_markets where daily_report_id = r.id)
     and not exists(select 1 from daily_report_invoices where daily_report_id = r.id and status <> 'cancelled') then
    raise exception 'At least one visited market or invoice is required';
  end if;

  old := r.status;
  perform recalculate_daily_report(r.id);

  update daily_reports
  set status = 'submitted',
      submitted_at = now(),
      submitted_by = auth.uid(),
      updated_by = auth.uid()
  where id = r.id
  returning * into r;

  insert into daily_report_approvals(daily_report_id, manager_id, action, old_status, new_status)
  values(r.id, auth.uid(), case when old = 'returned' then 'resubmitted' else 'submitted' end, old, 'submitted');

  return r;
end $$;

grant execute on function public.submit_daily_report(uuid) to authenticated;
