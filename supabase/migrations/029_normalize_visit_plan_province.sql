-- Match Visit Plan province names regardless of common Khmer prefixes and spacing.

create or replace function public.normalize_location_name(value text) returns text
language sql immutable set search_path=public as $$
  select regexp_replace(regexp_replace(lower(trim(coalesce(value,''))),'^(ខេត្ត|រាជធានី)',''),'[[:space:]]','','g');
$$;

create or replace function public.prepare_fuel_budget_plan() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_row public.visit_plans; matched_province_id bigint;
begin
  if new.visit_plan_id is null then raise exception 'Visit Plan is required'; end if;
  select * into plan_row from public.visit_plans where id=new.visit_plan_id and status<>'cancelled';
  if plan_row.id is null or plan_row.assigned_to is distinct from new.sales_user_id then raise exception 'Invalid Visit Plan for selected Sales'; end if;
  select id into matched_province_id from public.provinces where is_active and (
    public.normalize_location_name(name_kh)=public.normalize_location_name(plan_row.province)
    or public.normalize_location_name(name_en)=public.normalize_location_name(plan_row.province)
  ) limit 1;
  if matched_province_id is null then raise exception 'Visit Plan province does not match Province lookup: %',plan_row.province; end if;
  new.province_id:=matched_province_id;
  if tg_op='UPDATE' then new.updated_by:=auth.uid(); end if;
  return new;
end $$;
