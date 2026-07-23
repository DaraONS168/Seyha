create sequence if not exists public.daily_report_code_sequence start 1;

create table public.sales_teams(id uuid primary key default gen_random_uuid(),name text not null unique,manager_id uuid not null references public.profiles(id),is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.sales_team_members(team_id uuid references public.sales_teams(id) on delete cascade,sales_user_id uuid references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(team_id,sales_user_id));
create table public.visit_plan_markets(visit_plan_id uuid references public.visit_plans(id) on delete cascade,market_id uuid references public.markets(id) on delete cascade,created_at timestamptz not null default now(),primary key(visit_plan_id,market_id));

alter table public.expense_categories add column if not exists requires_receipt boolean not null default false;
alter table public.expense_categories add column if not exists is_fuel boolean not null default false;
insert into public.expense_categories(code,name_kh,name_en,is_active,requires_receipt,is_fuel) values
('FUEL','សាំង','Fuel',true,true,true),('FOOD','អាហារ','Food',true,false,false),('PARKING','ចំណត','Parking',true,false,false),('HOTEL','សណ្ឋាគារ','Hotel',true,true,false),('TRANSPORT','មធ្យោបាយធ្វើដំណើរ','Transportation',true,true,false),('PHONE','ទូរស័ព្ទ','Phone',true,false,false),('CUSTOMER_MEETING','ជួបអតិថិជន','Customer Meeting',true,true,false),('OTHER','ផ្សេងៗ','Other',true,false,false)
on conflict(code) do update set requires_receipt=excluded.requires_receipt,is_fuel=excluded.is_fuel;

create table public.daily_reports(
 id uuid primary key default gen_random_uuid(),report_code text not null unique,report_date date not null,visit_plan_id uuid not null references public.visit_plans(id),sales_user_id uuid not null references public.profiles(id),sales_team_id uuid references public.sales_teams(id),province_id bigint not null references public.provinces(id),vehicle_id uuid references public.vehicles(id),total_markets_visited integer not null default 0,total_expense numeric(14,2) not null default 0,total_fuel_expense numeric(14,2) not null default 0,total_other_expense numeric(14,2) not null default 0,report_summary text,problems text,next_plan text,status text not null default 'draft' check(status in('draft','submitted','returned','approved','rejected')),submitted_at timestamptz,submitted_by uuid references public.profiles(id),approved_at timestamptz,approved_by uuid references public.profiles(id),rejected_at timestamptz,rejected_by uuid references public.profiles(id),manager_comment text,created_by uuid not null references public.profiles(id) default auth.uid(),updated_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,unique(sales_user_id,visit_plan_id,report_date)
);
create table public.daily_report_markets(id uuid primary key default gen_random_uuid(),daily_report_id uuid not null references public.daily_reports(id) on delete cascade,market_id uuid not null references public.markets(id),visit_result text not null check(visit_result in('visited','customer_met','no_customer','market_closed','rescheduled','other')),customer_count integer not null default 0 check(customer_count>=0),order_count integer not null default 0 check(order_count>=0),sales_amount numeric(14,2) not null default 0 check(sales_amount>=0),collection_amount numeric(14,2) not null default 0 check(collection_amount>=0),remark text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(daily_report_id,market_id));
create table public.daily_report_expenses(id uuid primary key default gen_random_uuid(),daily_report_id uuid not null references public.daily_reports(id) on delete cascade,expense_category_id bigint not null references public.expense_categories(id),market_id uuid references public.markets(id),expense_date date not null,description text,vendor_name text,invoice_number text,quantity numeric(10,2) not null default 1 check(quantity>0),unit_price numeric(14,2) not null check(unit_price>0),amount numeric(14,2) generated always as(quantity*unit_price) stored,receipt_file text,note text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index daily_report_invoice_unique on public.daily_report_expenses(daily_report_id,lower(invoice_number)) where invoice_number is not null and trim(invoice_number)<>'';
create table public.daily_report_approvals(id uuid primary key default gen_random_uuid(),daily_report_id uuid not null references public.daily_reports(id) on delete cascade,manager_id uuid not null references public.profiles(id),action text not null check(action in('submitted','approved','returned','rejected','resubmitted')),comment text,old_status text not null,new_status text not null,action_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.fuel_expenses add column if not exists daily_report_id uuid references public.daily_reports(id) on delete set null;

create index daily_reports_filter_idx on public.daily_reports(report_date desc,status,sales_user_id,province_id) where deleted_at is null;
create index daily_report_expenses_report_idx on public.daily_report_expenses(daily_report_id,expense_category_id);
create index daily_report_approvals_report_idx on public.daily_report_approvals(daily_report_id,action_at desc);

create or replace function public.recalculate_daily_report(p_report uuid) returns void language plpgsql security definer set search_path=public as $$
declare market_total integer;other_total numeric;fuel_total numeric;
begin
 select count(*) into market_total from daily_report_markets where daily_report_id=p_report;
 select coalesce(sum(e.amount),0) into other_total from daily_report_expenses e join expense_categories c on c.id=e.expense_category_id where e.daily_report_id=p_report and not c.is_fuel;
 select coalesce(sum(total_amount),0) into fuel_total from fuel_expenses where daily_report_id=p_report and deleted_at is null and status not in('rejected','cancelled');
 update daily_reports set total_markets_visited=market_total,total_other_expense=other_total,total_fuel_expense=fuel_total,total_expense=other_total+fuel_total,updated_at=now(),updated_by=auth.uid() where id=p_report;
end $$;
create or replace function public.daily_report_child_changed() returns trigger language plpgsql security definer set search_path=public as $$ begin perform recalculate_daily_report(coalesce(new.daily_report_id,old.daily_report_id));return coalesce(new,old);end $$;
create trigger daily_report_markets_totals after insert or update or delete on public.daily_report_markets for each row execute function public.daily_report_child_changed();
create trigger daily_report_expenses_totals after insert or update or delete on public.daily_report_expenses for each row execute function public.daily_report_child_changed();

create or replace function public.prepare_daily_report() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_row visit_plans;province_key bigint;team_key uuid;
begin
 select * into plan_row from visit_plans where id=new.visit_plan_id and status<>'cancelled';
 if plan_row.id is null or plan_row.assigned_to<>new.sales_user_id then raise exception 'Invalid Visit Plan for Sales';end if;
 if new.report_date<plan_row.start_date or new.report_date>plan_row.end_date then raise exception 'Report date must be within Visit Plan';end if;
 select id into province_key from provinces where is_active and (normalize_location_name(name_kh)=normalize_location_name(plan_row.province) or normalize_location_name(name_en)=normalize_location_name(plan_row.province)) limit 1;
 if province_key is null then raise exception 'Visit Plan province not found';end if;
 select team_id into team_key from sales_team_members where sales_user_id=new.sales_user_id limit 1;
 new.province_id:=province_key;new.sales_team_id:=team_key;
 if tg_op='INSERT' then new.report_code:='DR-'||extract(year from new.report_date)::int||'-'||lpad(nextval('daily_report_code_sequence')::text,6,'0');new.created_by:=auth.uid();
 elsif old.status not in('draft','returned') and new.status=old.status then raise exception 'Locked report cannot be edited';end if;
 return new;
end $$;
create trigger daily_reports_prepare before insert or update on public.daily_reports for each row execute function public.prepare_daily_report();

create or replace function public.submit_daily_report(p_report uuid) returns daily_reports language plpgsql security definer set search_path=public as $$ declare r daily_reports;old text;begin select * into r from daily_reports where id=p_report and deleted_at is null for update;if r.sales_user_id<>auth.uid() or r.status not in('draft','returned') then raise exception 'Report cannot be submitted';end if;if not exists(select 1 from daily_report_markets where daily_report_id=r.id) then raise exception 'At least one visited market is required';end if;old:=r.status;perform recalculate_daily_report(r.id);update daily_reports set status='submitted',submitted_at=now(),submitted_by=auth.uid() where id=r.id returning * into r;insert into daily_report_approvals(daily_report_id,manager_id,action,old_status,new_status) values(r.id,auth.uid(),case when old='returned' then 'resubmitted' else 'submitted' end,old,'submitted');return r;end $$;
create or replace function public.review_daily_report(p_report uuid,p_action text,p_comment text default null) returns daily_reports language plpgsql security definer set search_path=public as $$ declare r daily_reports;next_status text;begin select * into r from daily_reports where id=p_report and status='submitted' and deleted_at is null for update;if r.sales_user_id=auth.uid() then raise exception 'Self approval is not allowed';end if;if not has_permission('daily_reports.review') then raise exception 'Review permission required';end if;if r.sales_team_id is not null and not exists(select 1 from sales_teams where id=r.sales_team_id and manager_id=auth.uid()) and not is_admin() then raise exception 'Report is outside assigned team';end if;if p_action not in('approved','returned','rejected') then raise exception 'Invalid action';end if;if p_action in('returned','rejected') and coalesce(trim(p_comment),'')='' then raise exception 'Comment is required';end if;next_status:=p_action;update daily_reports set status=next_status,manager_comment=p_comment,approved_at=case when p_action='approved' then now() end,approved_by=case when p_action='approved' then auth.uid() end,rejected_at=case when p_action='rejected' then now() end,rejected_by=case when p_action='rejected' then auth.uid() end where id=r.id returning * into r;insert into daily_report_approvals(daily_report_id,manager_id,action,comment,old_status,new_status) values(r.id,auth.uid(),p_action,p_comment,'submitted',next_status);return r;end $$;

alter table public.sales_teams enable row level security;alter table public.sales_team_members enable row level security;alter table public.visit_plan_markets enable row level security;alter table public.daily_reports enable row level security;alter table public.daily_report_markets enable row level security;alter table public.daily_report_expenses enable row level security;alter table public.daily_report_approvals enable row level security;
create policy daily_reports_read on public.daily_reports for select to authenticated using(has_permission('daily_reports.view') and (sales_user_id=auth.uid() or is_admin() or exists(select 1 from sales_teams where id=sales_team_id and manager_id=auth.uid())));
create policy daily_reports_create on public.daily_reports for insert to authenticated with check(has_permission('daily_reports.create') and sales_user_id=auth.uid());
create policy daily_reports_update on public.daily_reports for update to authenticated using(has_permission('daily_reports.update') and sales_user_id=auth.uid() and status in('draft','returned'));
create policy daily_reports_delete on public.daily_reports for delete to authenticated using(has_permission('daily_reports.delete') and sales_user_id=auth.uid() and status='draft');
create policy daily_report_markets_access on public.daily_report_markets for all to authenticated using(exists(select 1 from daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid() and r.status in('draft','returned'))) with check(exists(select 1 from daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid() and r.status in('draft','returned')));
create policy daily_report_markets_owner_read on public.daily_report_markets for select to authenticated using(exists(select 1 from daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid()));
create policy daily_report_markets_review on public.daily_report_markets for select to authenticated using(exists(select 1 from daily_reports r where r.id=daily_report_id and (is_admin() or exists(select 1 from sales_teams t where t.id=r.sales_team_id and t.manager_id=auth.uid()))));
create policy daily_report_expenses_access on public.daily_report_expenses for all to authenticated using(exists(select 1 from daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid() and r.status in('draft','returned'))) with check(exists(select 1 from daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid() and r.status in('draft','returned')));
create policy daily_report_expenses_owner_read on public.daily_report_expenses for select to authenticated using(exists(select 1 from daily_reports r where r.id=daily_report_id and r.sales_user_id=auth.uid()));
create policy daily_report_expenses_review on public.daily_report_expenses for select to authenticated using(exists(select 1 from daily_reports r where r.id=daily_report_id and (is_admin() or exists(select 1 from sales_teams t where t.id=r.sales_team_id and t.manager_id=auth.uid()))));
create policy daily_report_approvals_read on public.daily_report_approvals for select to authenticated using(exists(select 1 from daily_reports r where r.id=daily_report_id));
create policy sales_teams_read on public.sales_teams for select to authenticated using(true);create policy sales_team_members_read on public.sales_team_members for select to authenticated using(true);create policy visit_plan_markets_read on public.visit_plan_markets for select to authenticated using(can_access_visit_plan(visit_plan_id) or is_admin());
grant execute on function public.submit_daily_report(uuid) to authenticated;grant execute on function public.review_daily_report(uuid,text,text) to authenticated;

update public.app_roles set permissions=permissions||'["daily_reports.view","daily_reports.create","daily_reports.update","daily_reports.delete"]'::jsonb where key in('admin','sales');
update public.app_roles set permissions=permissions||'["daily_reports.view","daily_reports.review"]'::jsonb where key in('admin','manager');
update public.profiles p set permissions=r.permissions from public.app_roles r where p.role=r.key;

do $$ declare manager_key uuid;team_key uuid;begin
 select id into manager_key from public.profiles where role in('manager','admin') and is_active order by case when role='manager' then 0 else 1 end limit 1;
 if manager_key is not null then
  insert into public.sales_teams(name,manager_id) values('ក្រុម Sales ទូទៅ',manager_key) on conflict(name) do update set manager_id=excluded.manager_id returning id into team_key;
  insert into public.sales_team_members(team_id,sales_user_id) select team_key,id from public.profiles where role='sales' and is_active on conflict do nothing;
 end if;
end $$;
