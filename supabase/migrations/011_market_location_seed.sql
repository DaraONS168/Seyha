-- Starter geographic lookup data for Market Management.
-- Additional official location codes can be imported later without changing the schema.

insert into public.provinces(code, name_kh, name_en) values
  ('PP', 'រាជធានីភ្នំពេញ', 'Phnom Penh'),
  ('KD', 'ខេត្តកណ្ដាល', 'Kandal'),
  ('SR', 'ខេត្តសៀមរាប', 'Siem Reap')
on conflict (code) do update set name_kh = excluded.name_kh, name_en = excluded.name_en, is_active = true;

insert into public.districts(province_id, code, name_kh, name_en) values
  ((select id from public.provinces where code = 'PP'), 'PP-CM', 'ខណ្ឌចំការមន', 'Chamkar Mon'),
  ((select id from public.provinces where code = 'PP'), 'PP-BKK', 'ខណ្ឌបឹងកេងកង', 'Boeng Keng Kang'),
  ((select id from public.provinces where code = 'KD'), 'KD-TK', 'ក្រុងតាខ្មៅ', 'Ta Khmau'),
  ((select id from public.provinces where code = 'SR'), 'SR-SR', 'ក្រុងសៀមរាប', 'Siem Reap Municipality')
on conflict (code) do update set province_id = excluded.province_id, name_kh = excluded.name_kh, name_en = excluded.name_en, is_active = true;

insert into public.communes(district_id, code, name_kh, name_en) values
  ((select id from public.districts where code = 'PP-CM'), 'PP-CM-TB', 'សង្កាត់ទន្លេបាសាក់', 'Tonle Basak'),
  ((select id from public.districts where code = 'PP-BKK'), 'PP-BKK-BKK1', 'សង្កាត់បឹងកេងកងទី១', 'Boeng Keng Kang Ti Muoy'),
  ((select id from public.districts where code = 'KD-TK'), 'KD-TK-TK', 'សង្កាត់តាខ្មៅ', 'Ta Khmau'),
  ((select id from public.districts where code = 'SR-SR'), 'SR-SR-SV', 'សង្កាត់ស្វាយដង្គំ', 'Svay Dangkum')
on conflict (code) do update set district_id = excluded.district_id, name_kh = excluded.name_kh, name_en = excluded.name_en, is_active = true;

insert into public.villages(commune_id, code, name_kh, name_en) values
  ((select id from public.communes where code = 'PP-CM-TB'), 'PP-CM-TB-01', 'ភូមិទី១', 'Village 1'),
  ((select id from public.communes where code = 'PP-BKK-BKK1'), 'PP-BKK-BKK1-01', 'ភូមិទី១', 'Village 1'),
  ((select id from public.communes where code = 'KD-TK-TK'), 'KD-TK-TK-01', 'ភូមិថ្មី', 'Phum Thmei'),
  ((select id from public.communes where code = 'SR-SR-SV'), 'SR-SR-SV-01', 'ភូមិស្វាយដង្គំ', 'Svay Dangkum Village')
on conflict (code) do update set commune_id = excluded.commune_id, name_kh = excluded.name_kh, name_en = excluded.name_en, is_active = true;
