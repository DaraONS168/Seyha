-- Allow Admin sync to create due reminders for the whole team; Sales sync only their own.
create or replace function public.sync_due_notifications() returns integer
language plpgsql security invoker set search_path = public as $$
declare inserted_count integer;
begin
  insert into public.notifications(user_id,customer_id,title,message,notification_type)
  select f.assigned_to,f.customer_id,'ដល់ពេល Follow Up',
    'ដល់ពេល Follow Up ជាមួយ '||c.name||' នៅ '||to_char(f.follow_up_at,'DD/MM/YYYY HH24:MI'),'follow_up'
  from public.follow_ups f join public.customers c on c.id=f.customer_id
  where (public.is_admin() or f.assigned_to=auth.uid())
    and f.status='pending' and f.follow_up_at<=now()
    and c.status not in ('converted','cancelled')
    and not exists(
      select 1 from public.notifications n
      where n.user_id=f.assigned_to and n.customer_id=f.customer_id
        and n.notification_type='follow_up'
        and n.message like '%'||to_char(f.follow_up_at,'DD/MM/YYYY HH24:MI')
    );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;
