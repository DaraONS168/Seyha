import { mkdir, readFile, writeFile } from 'node:fs/promises'

const cacheDirectory = new URL('../.cache/cambodia-markets-v2/', import.meta.url)
const geocodeCacheDirectory = new URL('../.cache/cambodia-market-geocodes/', import.meta.url)
const outputFile = new URL('../supabase/seed/cambodia-markets-osm.json', import.meta.url)
const migrationFile = new URL('../supabase/migrations/016_seed_cambodia_openstreetmap_markets.sql', import.meta.url)
const endpoint = 'https://overpass-api.de/api/interpreter'
const latitudeBreaks = [10.3, 11.5, 12.6, 13.7, 14.8]
const longitudeBreaks = [102.2, 103.6, 105, 106.4, 107.8]
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

await mkdir(cacheDirectory, { recursive: true })
await mkdir(geocodeCacheDirectory, { recursive: true })
await mkdir(new URL('../supabase/seed/', import.meta.url), { recursive: true })

const fetchTile = async (bounds, key, attempt = 1) => {
  const cacheFile = new URL(`${key}.json`, cacheDirectory)
  try {
    return JSON.parse(await readFile(cacheFile, 'utf8'))
  } catch {
    const query = `[out:json][timeout:90];area["ISO3166-1"="KH"]["boundary"="administrative"]->.kh;nwr(area.kh)["amenity"="marketplace"](${bounds.join(',')});out center tags;`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Seyha-Cambodia-Market-Importer/1.0',
      },
      body: new URLSearchParams({ data: query }),
    })
    if (!response.ok) {
      if (attempt >= 4) throw new Error(`Overpass ${response.status} for tile ${key}`)
      await delay(attempt * 2500)
      return fetchTile(bounds, key, attempt + 1)
    }
    const payload = await response.json()
    await writeFile(cacheFile, JSON.stringify(payload))
    return payload
  }
}

const elements = new Map()
for (let latitudeIndex = 0; latitudeIndex < latitudeBreaks.length - 1; latitudeIndex += 1) {
  for (let longitudeIndex = 0; longitudeIndex < longitudeBreaks.length - 1; longitudeIndex += 1) {
    const bounds = [
      latitudeBreaks[latitudeIndex],
      longitudeBreaks[longitudeIndex],
      latitudeBreaks[latitudeIndex + 1],
      longitudeBreaks[longitudeIndex + 1],
    ]
    const key = `${latitudeIndex}-${longitudeIndex}`
    const payload = await fetchTile(bounds, key)
    for (const element of payload.elements) elements.set(`${element.type}/${element.id}`, element)
    process.stdout.write(`Tile ${key}: ${payload.elements.length} markets\n`)
    await delay(500)
  }
}

const reverseGeocode = async (market, index, attempt = 1) => {
  const cacheFile = new URL(`${market.osm_id.replace('/', '-')}.json`, geocodeCacheDirectory)
  try {
    return JSON.parse(await readFile(cacheFile, 'utf8'))
  } catch {
    if (index > 0) await delay(1100)
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.search = new URLSearchParams({
      format: 'jsonv2', lat: market.latitude, lon: market.longitude, zoom: '18', addressdetails: '1',
    })
    const response = await fetch(url, { headers: { 'User-Agent': 'Seyha-Cambodia-Market-Importer/1.0 (government market dataset)' } })
    if (!response.ok) {
      if (attempt >= 3) return { error: `Nominatim ${response.status}` }
      await delay(attempt * 2000)
      return reverseGeocode(market, index, attempt + 1)
    }
    const payload = await response.json()
    await writeFile(cacheFile, JSON.stringify(payload))
    return payload
  }
}

const rawMarkets = [...elements.values()].filter(element => {
  const latitude = element.lat ?? element.center?.lat
  const longitude = element.lon ?? element.center?.lon
  return latitude && longitude && (element.tags?.name || element.tags?.['name:km'] || element.tags?.['name:en'])
}).map(element => ({
  osm_id: `${element.type}/${element.id}`,
  latitude: element.lat ?? element.center.lat,
  longitude: element.lon ?? element.center.lon,
  tags: element.tags,
})).sort((left, right) => left.osm_id.localeCompare(right.osm_id))

const markets = []
for (let index = 0; index < rawMarkets.length; index += 1) {
  const market = rawMarkets[index]
  const geocode = await reverseGeocode(market, index)
  markets.push({ ...market, display_name: geocode.display_name, address: geocode.address || {}, geocode_error: geocode.error })
  if ((index + 1) % 20 === 0) process.stdout.write(`Geocoded ${index + 1}/${rawMarkets.length} markets\n`)
}

await writeFile(outputFile, `${JSON.stringify({ generated_at: new Date().toISOString(), source: endpoint, markets }, null, 2)}\n`)
const quote = value => value == null || value === '' ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const cleanPostcode = value => /^\d{6}$/.test(value || '') ? value : null
const provinceCode = value => {
  const match = String(value || '').match(/^KH-(\d{1,2})$/)
  return match ? match[1].padStart(2, '0') : null
}
const values = markets.map(market => {
  const postcode = cleanPostcode(market.address.postcode)
  const primaryName = market.tags['name:km'] || market.tags.name || market.tags['name:en']
  const englishName = market.tags['name:en'] || (/^[\x00-\x7F]+$/.test(market.tags.name || '') ? market.tags.name : null)
  const isNightMarket = /night|រាត្រី/i.test(`${primaryName} ${englishName || ''}`)
  const row = [
    market.osm_id, primaryName, englishName, isNightMarket ? 'night_market' : 'public_market',
    provinceCode(market.address['ISO3166-2-lvl4']), postcode?.slice(0, 4), postcode,
    market.address.county || market.address.city_district || market.address.city || market.address.town,
    market.address.road || market.tags['addr:street'], market.display_name,
    market.latitude, market.longitude, market.tags.opening_hours,
    postcode ? 'verified' : 'needs_review',
  ].map(quote).join(', ')
  return `(${row})`
}).join(',\n  ')

const migration = `-- Cambodia markets imported from OpenStreetMap on ${new Date().toISOString().slice(0, 10)}.
-- Source data is © OpenStreetMap contributors, licensed under ODbL 1.0.

begin;

alter table public.markets add column if not exists source text;
alter table public.markets add column if not exists source_id text;
alter table public.markets add column if not exists source_url text;
alter table public.markets add column if not exists source_updated_at timestamptz;
alter table public.markets add column if not exists data_quality_status text not null default 'verified'
  check (data_quality_status in ('verified', 'needs_review'));
alter table public.markets add column if not exists attribution text;
alter table public.markets alter column district_id drop not null;
alter table public.markets alter column commune_id drop not null;
create unique index if not exists markets_source_identity_idx on public.markets(source, source_id)
  where source is not null and source_id is not null;

create or replace function public.prepare_market() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  province_code text;
  district_province_id bigint;
  commune_district_id bigint;
  village_commune_id bigint;
begin
  select code into province_code from public.provinces where id = new.province_id and is_active;
  if province_code is null then raise exception 'Invalid province'; end if;
  if new.district_id is not null then
    select province_id into district_province_id from public.districts where id = new.district_id and is_active;
    if district_province_id is distinct from new.province_id then raise exception 'Invalid district relationship'; end if;
  end if;
  if new.commune_id is not null then
    select district_id into commune_district_id from public.communes where id = new.commune_id and is_active;
    if new.district_id is null or commune_district_id is distinct from new.district_id then raise exception 'Invalid commune relationship'; end if;
  end if;
  if new.village_id is not null then
    select commune_id into village_commune_id from public.villages where id = new.village_id and is_active;
    if new.commune_id is null or village_commune_id is distinct from new.commune_id then raise exception 'Invalid village relationship'; end if;
  end if;
  if tg_op = 'INSERT' then
    new.market_code := 'MKT-' || province_code || '-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.market_code_sequence')::text, 5, '0');
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.market_code := old.market_code;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  new.google_map_url := 'https://www.google.com/maps?q=' || new.latitude || ',' || new.longitude;
  return new;
end $$;

alter table public.markets disable trigger markets_prevent_duplicate;
alter table public.markets disable trigger markets_prepare;

with source_data(source_id, name_kh, name_en, market_type_code, province_code, district_code, commune_code, district_name, street, full_address, latitude, longitude, opening_hours, quality) as (values
  ${values}
), admin_profile as (
  select id from public.profiles where role = 'admin' order by created_at limit 1
), resolved as (
  select source_data.*,
    province.id as province_id,
    coalesce(district_by_code.id, district_by_name.id) as district_id,
    commune.id as commune_id,
    market_type.id as market_type_id,
    admin_profile.id as actor_id
  from source_data
  join public.provinces province on province.code = source_data.province_code
  join public.market_types market_type on market_type.code = source_data.market_type_code
  cross join admin_profile
  left join public.districts district_by_code on district_by_code.code = source_data.district_code
    and district_by_code.province_id = province.id and district_by_code.is_active
  left join lateral (
    select district.id from public.districts district
    where district.province_id = province.id and district.is_active
      and lower(regexp_replace(district.name_kh, '^(ក្រុង|ស្រុក|ខណ្ឌ)', '')) = lower(regexp_replace(coalesce(source_data.district_name, ''), '^(ក្រុង|ស្រុក|ខណ្ឌ)', ''))
    limit 1
  ) district_by_name on true
  left join public.communes commune on commune.code = source_data.commune_code
    and commune.district_id = coalesce(district_by_code.id, district_by_name.id) and commune.is_active
)
insert into public.markets(
  market_code, name_kh, name_en, market_type_id, status, province_id, district_id, commune_id,
  street, full_address, latitude, longitude, description, created_by,
  google_map_url, source, source_id, source_url, source_updated_at, data_quality_status, attribution
)
select 'MKT-OSM-' || upper(left(source_id, 1)) || '-' || split_part(source_id, '/', 2),
  name_kh, name_en, market_type_id, 'active', province_id, district_id, commune_id,
  street, full_address, latitude::numeric, longitude::numeric,
  case when opening_hours is null then 'Imported from OpenStreetMap; administrative location may require verification.'
    else 'Opening hours: ' || opening_hours || '. Imported from OpenStreetMap.' end,
  actor_id, 'https://www.google.com/maps?q=' || latitude || ',' || longitude,
  'OpenStreetMap', source_id, 'https://www.openstreetmap.org/' || source_id,
  now(), case when commune_id is not null then 'verified' else 'needs_review' end,
  '© OpenStreetMap contributors, ODbL 1.0'
from resolved
where not exists (
  select 1 from public.markets existing
  where existing.source = 'OpenStreetMap' and existing.source_id = resolved.source_id
)
on conflict do nothing;

alter table public.markets enable trigger markets_prevent_duplicate;
alter table public.markets enable trigger markets_prepare;

commit;
`

await writeFile(migrationFile, migration)
process.stdout.write(`Saved ${markets.length} named markets to ${outputFile.pathname}\n`)
process.stdout.write(`Generated migration ${migrationFile.pathname}\n`)
