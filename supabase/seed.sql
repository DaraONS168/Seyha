-- Run AFTER creating demo users in Authentication > Users.
-- Replace the emails if you chose different demo addresses.
update public.profiles set full_name='Demo Administrator', role='admin'
where email='admin@demo.com';
update public.profiles set full_name='Demo Sales', role='sales'
where email='sales@demo.com';

-- Optional sample customers are inserted only when both profiles exist.
insert into public.customers(name,phone,gender,province,source,interested_product,assigned_to,status,priority,next_follow_up_at,notes,created_by)
select 'សុខ ដារ៉ា','012345678','male','ភ្នំពេញ','facebook','Website Development',s.id,'new_lead','high',now()+interval '2 hours','អតិថិជនសាកល្បង',a.id
from public.profiles s cross join public.profiles a
where s.email='sales@demo.com' and a.email='admin@demo.com'
and not exists(select 1 from public.customers where phone='012345678');

insert into public.customers(name,phone,gender,province,source,interested_product,assigned_to,status,priority,next_follow_up_at,notes,created_by)
select 'ចាន់ ស្រីនាង','098765432','female','កណ្ដាល','telegram','Digital Marketing',s.id,'interested','urgent',now()-interval '1 hour','សួរតម្លៃ package',a.id
from public.profiles s cross join public.profiles a
where s.email='sales@demo.com' and a.email='admin@demo.com'
and not exists(select 1 from public.customers where phone='098765432');
