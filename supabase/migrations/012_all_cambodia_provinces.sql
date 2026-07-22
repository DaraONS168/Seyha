-- Complete Cambodia capital/province lookup list (25 entries).

insert into public.provinces(code, name_kh, name_en) values
  ('PP', 'រាជធានីភ្នំពេញ', 'Phnom Penh'),
  ('BM', 'ខេត្តបន្ទាយមានជ័យ', 'Banteay Meanchey'),
  ('BB', 'ខេត្តបាត់ដំបង', 'Battambang'),
  ('KC', 'ខេត្តកំពង់ចាម', 'Kampong Cham'),
  ('KG', 'ខេត្តកំពង់ឆ្នាំង', 'Kampong Chhnang'),
  ('KS', 'ខេត្តកំពង់ស្ពឺ', 'Kampong Speu'),
  ('KT', 'ខេត្តកំពង់ធំ', 'Kampong Thom'),
  ('KP', 'ខេត្តកំពត', 'Kampot'),
  ('KD', 'ខេត្តកណ្ដាល', 'Kandal'),
  ('KB', 'ខេត្តកែប', 'Kep'),
  ('KK', 'ខេត្តកោះកុង', 'Koh Kong'),
  ('KR', 'ខេត្តក្រចេះ', 'Kratie'),
  ('MK', 'ខេត្តមណ្ឌលគិរី', 'Mondulkiri'),
  ('OM', 'ខេត្តឧត្តរមានជ័យ', 'Oddar Meanchey'),
  ('PL', 'ខេត្តប៉ៃលិន', 'Pailin'),
  ('SH', 'ខេត្តព្រះសីហនុ', 'Preah Sihanouk'),
  ('PV', 'ខេត្តព្រះវិហារ', 'Preah Vihear'),
  ('PS', 'ខេត្តពោធិ៍សាត់', 'Pursat'),
  ('PE', 'ខេត្តព្រៃវែង', 'Prey Veng'),
  ('RK', 'ខេត្តរតនគិរី', 'Ratanakiri'),
  ('SR', 'ខេត្តសៀមរាប', 'Siem Reap'),
  ('ST', 'ខេត្តស្ទឹងត្រែង', 'Stung Treng'),
  ('SV', 'ខេត្តស្វាយរៀង', 'Svay Rieng'),
  ('TK', 'ខេត្តតាកែវ', 'Takeo'),
  ('TB', 'ខេត្តត្បូងឃ្មុំ', 'Tboung Khmum')
on conflict (code) do update set
  name_kh = excluded.name_kh,
  name_en = excluded.name_en,
  is_active = true;
