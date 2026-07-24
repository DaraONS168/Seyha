-- Allow fuel managers/reviewers to record fuel expenses for a selected Sales visit plan.

drop policy if exists fuel_expenses_create on public.fuel_expenses;
create policy fuel_expenses_create on public.fuel_expenses for insert to authenticated
with check(
  public.has_permission('fuel.create')
  and created_by = auth.uid()
  and (
    sales_user_id = auth.uid()
    or public.has_permission('fuel.approve')
    or public.has_permission('fuel.budgets.manage')
  )
);
