import { supabase } from './supabase'

const activeLookup = table => supabase
  .from(table)
  .select('id,code,name_kh,name_en')
  .eq('is_active', true)
  .order('name_kh')

export const marketLookupService = {
  marketTypes: () => activeLookup('market_types'),
  provinces: () => activeLookup('provinces'),
  districts: provinceId => activeLookup('districts').eq('province_id', provinceId),
  communes: districtId => activeLookup('communes').eq('district_id', districtId),
  villages: communeId => activeLookup('villages').eq('commune_id', communeId),
  allDistricts: () => activeLookup('districts'),
  allCommunes: () => activeLookup('communes'),
  allVillages: () => activeLookup('villages'),
}
