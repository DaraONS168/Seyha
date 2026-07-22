-- Expense governance: fiscal locks, revision history, alerts and reconciliation.

create table public.fiscal_year_controls (
  fiscal_year integer primary key check (fiscal_year between 2000 and 2200),
  status text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  reason text,
  updated_at timestamptz not null default now()
);

create table public.budget_revisions (
  id uuid primary key default gen_random_uuid(),
  provincial_budget_id uuid not null references public.provincial_budgets(id) on delete cascade,
  revision_amount numeric(16,2) not null check (revision_amount <> 0),
  previous_revised_amount numeric(16,2) not null,
  new_revised_amount numeric(16,2) not null,
  reason text not null check (char_length(trim(reason)) >= 5),
  reference_document text not null,
  requested_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.expense_verifications (
  id uuid primary key default gen_random_uuid(),
  expense_request_id uuid not null unique references public.expense_requests(id) on delete cascade,
  receipts_complete boolean not null,
  receipt_total_matches boolean not null,
  returned_amount_correct boolean not null,
  category_valid boolean not null,
  within_approved_amount boolean not null,
  notes text,
  verified_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budget_revisions_budget_idx on public.budget_revisions(provincial_budget_id,created_at desc);
create index expense_verifications_request_idx on public.expense_verifications(expense_request_id);
create trigger fiscal_year_controls_updated_at before update on public.fiscal_year_controls for each row execute function public.set_updated_at();
create trigger expense_verifications_updated_at before update on public.expense_verifications for each row execute function public.set_updated_at();

create or replace function public.is_fiscal_year_open(p_year integer) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select status='open' from public.fiscal_year_controls where fiscal_year=p_year),true);
$$;

create or replace function public.set_fiscal_year_status(p_year integer,p_status text,p_reason text default null) returns public.fiscal_year_controls
language plpgsql security definer set search_path=public as $$
declare result public.fiscal_year_controls;
begin
  if not public.has_permission('expenses.fiscal_lock') then raise exception 'Access denied'; end if;
  if p_status not in ('open','closed') then raise exception 'Invalid fiscal status'; end if;
  if p_status='closed' and char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'Closure reason is required'; end if;
  insert into public.fiscal_year_controls(fiscal_year,status,closed_at,closed_by,reason)
  values(p_year,p_status,case when p_status='closed' then now() end,case when p_status='closed' then auth.uid() end,nullif(trim(p_reason),''))
  on conflict(fiscal_year) do update set status=excluded.status,closed_at=excluded.closed_at,closed_by=excluded.closed_by,reason=excluded.reason
  returning * into result;
  return result;
end $$;

create or replace function public.protect_budget_revision() returns trigger language plpgsql as $$
begin
  if old.revised_amount is distinct from new.revised_amount and current_setting('app.budget_revision',true) is distinct from 'allowed' then
    raise exception 'Use revise_provincial_budget to change revised amount';
  end if;
  if not public.is_fiscal_year_open(old.fiscal_year) then raise exception 'Fiscal year % is closed',old.fiscal_year; end if;
  return new;
end $$;
create trigger provincial_budgets_protect_revision before update on public.provincial_budgets for each row execute function public.protect_budget_revision();

create or replace function public.revise_provincial_budget(p_budget_id uuid,p_amount numeric,p_reason text,p_reference_document text)
returns public.provincial_budgets language plpgsql security definer set search_path=public as $$
declare current_budget public.provincial_budgets; result public.provincial_budgets;
begin
  if not public.has_permission('expenses.budgets.revise') then raise exception 'Access denied'; end if;
  if p_amount=0 then raise exception 'Revision amount cannot be zero'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 or char_length(trim(coalesce(p_reference_document,'')))<3 then raise exception 'Reason and reference document are required'; end if;
  select * into current_budget from public.provincial_budgets where id=p_budget_id for update;
  if not public.is_fiscal_year_open(current_budget.fiscal_year) then raise exception 'Fiscal year is closed'; end if;
  if current_budget.approved_amount+current_budget.revised_amount+p_amount<current_budget.committed_amount+current_budget.actual_expense_amount then raise exception 'Revision would make available budget negative'; end if;
  perform set_config('app.budget_revision','allowed',true);
  update public.provincial_budgets set revised_amount=revised_amount+p_amount,updated_by=auth.uid() where id=p_budget_id returning * into result;
  insert into public.budget_revisions(provincial_budget_id,revision_amount,previous_revised_amount,new_revised_amount,reason,reference_document,requested_by,approved_by,approved_at)
  values(p_budget_id,p_amount,current_budget.revised_amount,result.revised_amount,trim(p_reason),trim(p_reference_document),auth.uid(),auth.uid(),now());
  return result;
end $$;

create or replace view public.budget_usage_alerts with (security_invoker=true) as
select budget.id,budget.fiscal_year,budget.province_id,budget.project_id,budget.expense_category_id,
  budget.approved_amount+budget.revised_amount as total_budget,budget.committed_amount+budget.actual_expense_amount as used_amount,budget.remaining_amount,
  round(case when budget.approved_amount+budget.revised_amount=0 then 0 else (budget.committed_amount+budget.actual_expense_amount)*100/(budget.approved_amount+budget.revised_amount) end,2) as usage_percentage,
  case when budget.remaining_amount<0 then 'exceeded' when (budget.committed_amount+budget.actual_expense_amount)*100/nullif(budget.approved_amount+budget.revised_amount,0)>=100 then 'critical'
    when (budget.committed_amount+budget.actual_expense_amount)*100/nullif(budget.approved_amount+budget.revised_amount,0)>=85 then 'high'
    when (budget.committed_amount+budget.actual_expense_amount)*100/nullif(budget.approved_amount+budget.revised_amount,0)>=70 then 'warning' else 'normal' end as alert_level,
  province.name_kh as province_name,project.name_kh as project_name,category.name_kh as category_name
from public.provincial_budgets budget join public.provinces province on province.id=budget.province_id join public.projects project on project.id=budget.project_id join public.expense_categories category on category.id=budget.expense_category_id
where budget.status='active';

create or replace function public.verify_expense_request(p_request_id uuid,p_receipts_complete boolean,p_receipt_total_matches boolean,p_returned_amount_correct boolean,p_category_valid boolean,p_within_approved_amount boolean,p_notes text default null)
returns public.expense_verifications language plpgsql security definer set search_path=public as $$
declare request_row public.expense_requests; result public.expense_verifications;
begin
  if not public.has_permission('expenses.verify') then raise exception 'Access denied'; end if;
  select * into request_row from public.expense_requests where id=p_request_id and status='paid';
  if request_row.id is null then raise exception 'Only paid requests can be verified'; end if;
  insert into public.expense_verifications(expense_request_id,receipts_complete,receipt_total_matches,returned_amount_correct,category_valid,within_approved_amount,notes,verified_by,verified_at)
  values(p_request_id,p_receipts_complete,p_receipt_total_matches,p_returned_amount_correct,p_category_valid,p_within_approved_amount,nullif(trim(p_notes),''),auth.uid(),now())
  on conflict(expense_request_id) do update set receipts_complete=excluded.receipts_complete,receipt_total_matches=excluded.receipt_total_matches,returned_amount_correct=excluded.returned_amount_correct,category_valid=excluded.category_valid,within_approved_amount=excluded.within_approved_amount,notes=excluded.notes,verified_by=auth.uid(),verified_at=now()
  returning * into result;
  return result;
end $$;

create or replace function public.complete_expense_request(p_request_id uuid) returns public.expense_requests
language plpgsql security definer set search_path=public as $$
declare request_row public.expense_requests; budget_row public.provincial_budgets; verification public.expense_verifications; item_count integer; result public.expense_requests;
begin
  if not public.has_permission('expenses.complete') then raise exception 'Access denied'; end if;
  select * into request_row from public.expense_requests where id=p_request_id and status='paid' for update;
  if request_row.id is null then raise exception 'Only fully paid requests can be completed'; end if;
  if not public.is_fiscal_year_open(extract(year from request_row.request_date)::integer) then raise exception 'Fiscal year is closed'; end if;
  select * into verification from public.expense_verifications where expense_request_id=p_request_id;
  if verification.id is null or not (verification.receipts_complete and verification.receipt_total_matches and verification.returned_amount_correct and verification.category_valid and (verification.within_approved_amount or public.has_permission('expenses.override_limit'))) then raise exception 'Reconciliation checklist is incomplete'; end if;
  select count(*) into item_count from public.expense_items where expense_request_id=p_request_id and attachment is not null;
  if item_count=0 then raise exception 'At least one supported expense item is required'; end if;
  select * into budget_row from public.provincial_budgets where fiscal_year=extract(year from request_row.request_date)::integer and province_id=request_row.province_id and project_id=request_row.project_id and expense_category_id=request_row.expense_category_id for update;
  update public.provincial_budgets set committed_amount=greatest(committed_amount-request_row.approved_amount,0),actual_expense_amount=actual_expense_amount+request_row.actual_amount,updated_by=auth.uid() where id=budget_row.id;
  update public.expense_requests set status='completed',returned_amount=amount_received-actual_amount,completed_at=now(),updated_by=auth.uid() where id=p_request_id returning * into result;
  return result;
end $$;

create or replace function public.prevent_closed_fiscal_request() returns trigger language plpgsql as $$
begin
  if not public.is_fiscal_year_open(extract(year from new.request_date)::integer) then raise exception 'Fiscal year is closed'; end if;
  return new;
end $$;
create trigger expense_requests_fiscal_open before insert or update of request_date on public.expense_requests for each row execute function public.prevent_closed_fiscal_request();

create or replace function public.prevent_closed_fiscal_budget() returns trigger language plpgsql as $$
begin
  if not public.is_fiscal_year_open(new.fiscal_year) then raise exception 'Fiscal year is closed'; end if;
  return new;
end $$;
create trigger provincial_budgets_fiscal_open before insert or update of fiscal_year on public.provincial_budgets for each row execute function public.prevent_closed_fiscal_budget();

update public.app_roles set permissions=permissions||'["expenses.budgets.revise","expenses.fiscal_lock","expenses.verify"]'::jsonb where key='admin';
update public.app_roles set permissions=permissions||'["expenses.verify"]'::jsonb where key='finance_reviewer';

alter table public.fiscal_year_controls enable row level security; alter table public.budget_revisions enable row level security; alter table public.expense_verifications enable row level security;
create policy fiscal_controls_read on public.fiscal_year_controls for select to authenticated using(public.has_permission('expenses.view'));
create policy budget_revisions_read on public.budget_revisions for select to authenticated using(public.has_permission('expenses.budgets.view'));
create policy expense_verifications_read on public.expense_verifications for select to authenticated using(public.has_permission('expenses.view'));
grant select on public.budget_usage_alerts to authenticated;
grant execute on function public.set_fiscal_year_status(integer,text,text) to authenticated;
grant execute on function public.revise_provincial_budget(uuid,numeric,text,text) to authenticated;
grant execute on function public.verify_expense_request(uuid,boolean,boolean,boolean,boolean,boolean,text) to authenticated;
