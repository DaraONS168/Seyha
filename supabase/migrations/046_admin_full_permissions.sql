update public.app_roles
set permissions = '[
  "dashboard.view","dashboard.create","dashboard.update","dashboard.delete",
  "notifications.view","notifications.create","notifications.update","notifications.delete",
  "customers.view","customers.create","customers.update","customers.delete",
  "follow_ups.view","follow_ups.create","follow_ups.update","follow_ups.delete",
  "visit_plans.view","visit_plans.create","visit_plans.update","visit_plans.delete",
  "calls.view","calls.create","calls.update","calls.delete",
  "reports.view","reports.create","reports.update","reports.delete",
  "sales_team.view","sales_team.create","sales_team.update","sales_team.delete",
  "markets.view","markets.create","markets.update","markets.delete","markets.restore","markets.import","markets.export","markets.view_audit",
  "expenses.view","expenses.create","expenses.update","expenses.delete","expenses.submit","expenses.approve","expenses.pay","expenses.actual","expenses.complete","expenses.reopen","expenses.override_limit","expenses.audit","expenses.reports","expenses.verify","expenses.fiscal_lock",
  "expenses.budgets.view","expenses.budgets.create","expenses.budgets.update","expenses.budgets.delete","expenses.budgets.revise",
  "fuel.view","fuel.create","fuel.update","fuel.delete","fuel.submit","fuel.approve","fuel.reports",
  "fuel.budgets.view","fuel.budgets.create","fuel.budgets.update","fuel.budgets.delete",
  "vehicles.view","vehicles.create","vehicles.update","vehicles.delete",
  "daily_reports.view","daily_reports.create","daily_reports.update","daily_reports.delete","daily_reports.review",
  "users.view","users.create","users.update","users.delete",
  "settings.view","settings.create","settings.update","settings.delete"
]'::jsonb
where key = 'admin';

update public.profiles profile
set permissions = role.permissions,
    updated_at = now()
from public.app_roles role
where profile.role = role.key
  and role.key = 'admin'
  and profile.permissions is distinct from role.permissions;

drop policy if exists daily_reports_update on public.daily_reports;
create policy daily_reports_update on public.daily_reports
for update to authenticated
using (
  public.has_permission('daily_reports.update')
  and deleted_at is null
  and (
    public.is_admin()
    or (sales_user_id = auth.uid() and status in ('draft','returned'))
    or (created_by = auth.uid() and status in ('draft','returned'))
  )
)
with check (
  public.has_permission('daily_reports.update')
  and deleted_at is null
  and (
    public.is_admin()
    or (sales_user_id = auth.uid() and status in ('draft','returned'))
    or (created_by = auth.uid() and status in ('draft','returned'))
  )
);

drop policy if exists daily_reports_delete on public.daily_reports;
create policy daily_reports_delete on public.daily_reports
for delete to authenticated
using (
  public.has_permission('daily_reports.delete')
  and deleted_at is null
  and (
    public.is_admin()
    or (sales_user_id = auth.uid() and status = 'draft')
    or (created_by = auth.uid() and status = 'draft')
  )
);
