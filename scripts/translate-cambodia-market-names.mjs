import { mkdir, readFile, writeFile } from 'node:fs/promises'

const sourceFile = new URL('../supabase/seed/cambodia-markets-osm.json', import.meta.url)
const outputFile = new URL('../supabase/seed/cambodia-market-name-translations.json', import.meta.url)
const migrationFile = new URL('../supabase/migrations/017_translate_market_names_to_khmer.sql', import.meta.url)
const cacheDirectory = new URL('../.cache/cambodia-market-translations/', import.meta.url)
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const hasKhmer = value => /[ក-៹]/.test(value || '')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const translationOverrides = {
  'node/13077553202': 'ឡាក់គី អ៊ិចប្រេស ទួលពង្រ',
  'node/13080663894': 'ប្រព័ន្ធសុវត្ថិភាព ជី-ស្មាត តិច-ស៊ីស៊ីធីវី',
  'node/4409203490': 'ផ្សារក្របីរៀល',
  'way/1352536791': 'ផ្សារលេខ៣',
  'way/1422961607': 'បុរីសាន់នី គម្រោងស៊ី',
  'way/1422995075': 'បុរីសាន់នី គម្រោងយូ',
  'way/170294649': 'ផ្សារព្រំដែនថាម៉ៅ',
  'way/310963695': 'ផ្សារចម្ការគរ (ផ្សារថ្មី)',
}

await mkdir(cacheDirectory, { recursive: true })
const { markets } = JSON.parse(await readFile(sourceFile, 'utf8'))

const translate = async (market, attempt = 1) => {
  const cacheFile = new URL(`${market.osm_id.replace('/', '-')}.txt`, cacheDirectory)
  try {
    return (await readFile(cacheFile, 'utf8')).trim()
  } catch {
    const sourceName = market.tags.name || market.tags['name:en']
    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.search = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'km', dt: 't', q: sourceName })
    const response = await fetch(url, { headers: { 'User-Agent': 'Seyha-Cambodia-Market-Importer/1.0' } })
    if (!response.ok) {
      if (attempt >= 4) throw new Error(`Translation ${response.status}: ${market.osm_id}`)
      await delay(attempt * 1000)
      return translate(market, attempt + 1)
    }
    const payload = await response.json()
    const translated = payload[0].map(segment => segment[0]).join('').trim()
    await writeFile(cacheFile, translated)
    await delay(200)
    return translated
  }
}

const translations = []
for (const market of markets) {
  const currentName = market.tags['name:km'] || market.tags.name || market.tags['name:en']
  if (hasKhmer(currentName)) continue
  const nameKh = translationOverrides[market.osm_id] || await translate(market)
  translations.push({ source_id: market.osm_id, name_en: currentName, name_kh: nameKh })
  if (translations.length % 20 === 0) process.stdout.write(`Translated ${translations.length} market names\n`)
}

await writeFile(outputFile, `${JSON.stringify({ generated_at: new Date().toISOString(), translations }, null, 2)}\n`)

const values = translations.map(item => `(${quote(item.source_id)}, ${quote(item.name_kh)}, ${quote(item.name_en)})`).join(',\n  ')
const migration = `-- Khmer display names generated for OpenStreetMap records lacking a Khmer name.
begin;

with translations(source_id, name_kh, name_en) as (values
  ${values}
)
update public.markets market
set name_kh = translations.name_kh,
    name_en = coalesce(market.name_en, translations.name_en),
    updated_at = now()
from translations
where market.source = 'OpenStreetMap'
  and market.source_id = translations.source_id
  and market.name_kh !~ '[ក-៹]';

commit;
`

await writeFile(migrationFile, migration)
process.stdout.write(`Saved ${translations.length} translations and generated migration 017.\n`)
