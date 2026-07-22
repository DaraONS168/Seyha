import { writeFile } from 'node:fs/promises'

const baseUrl = 'https://db.ncdd.gov.kh/gazetteer/view'
const output = new URL('../supabase/migrations/013_complete_cambodia_gazetteer.sql', import.meta.url)
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

const decode = value => value
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ')
  .trim()

const fetchPage = async (url, attempt = 1) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'Seyha-Market-Gazetteer-Importer/1.0' } })
  if (response.ok) return response.text()
  if (attempt >= 4) throw new Error(`${response.status} ${url}`)
  await delay(attempt * 750)
  return fetchPage(url, attempt + 1)
}

const parseRows = (html, rowPrefix) => {
  const rows = []
  const rowPattern = new RegExp(`<tr id="row_${rowPrefix}_[^"]+"[^>]*>([\\s\\S]*?)<\\/tr>`, 'g')
  for (const match of html.matchAll(rowPattern)) {
    const cells = [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(cell => decode(cell[1]))
    if (cells.length >= 4) rows.push({ code: cells[1], name_kh: cells[2], name_en: cells[3] })
  }
  return rows
}

const mapConcurrent = async (items, concurrency, worker) => {
  const results = new Array(items.length)
  let nextIndex = 0
  const runners = Array.from({ length: concurrency }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index], index)
      await delay(80)
    }
  })
  await Promise.all(runners)
  return results
}

const quote = value => `'${String(value || '').replaceAll("'", "''")}'`
const valuesSql = rows => rows.map(row => `  (${row.map(quote).join(', ')})`).join(',\n')

const provinceHtml = await mapConcurrent(Array.from({ length: 25 }, (_, index) => index + 1), 6, province => fetchPage(`${baseUrl}/province.castle?pv=${province}`))
const districts = provinceHtml.flatMap((html, index) => parseRows(html, 'ds').map(row => ({ ...row, province_code: String(index + 1).padStart(2, '0') })))

const districtPages = await mapConcurrent(districts, 8, district => fetchPage(`${baseUrl}/district.castle?ds=${Number(district.code)}`))
const communes = districtPages.flatMap((html, index) => parseRows(html, 'cm').map(row => ({ ...row, district_code: districts[index].code })))

const communePages = await mapConcurrent(communes, 10, (commune, index) => {
  if ((index + 1) % 100 === 0) process.stdout.write(`Fetched ${index + 1}/${communes.length} communes\n`)
  return fetchPage(`${baseUrl}/commune.castle?cm=${Number(commune.code)}`)
})
const villages = communePages.flatMap((html, index) => parseRows(html, 'vil').map(row => ({ ...row, commune_code: communes[index].code })))

const provinceCodeMap = [
  ['BM','01'], ['BB','02'], ['KC','03'], ['KG','04'], ['KS','05'], ['KT','06'], ['KP','07'], ['KD','08'], ['KK','09'],
  ['KR','10'], ['MK','11'], ['PP','12'], ['PV','13'], ['PE','14'], ['PS','15'], ['RK','16'], ['SR','17'], ['SH','18'],
  ['ST','19'], ['SV','20'], ['TK','21'], ['OM','22'], ['KB','23'], ['PL','24'], ['TB','25'],
]

const sql = `-- Complete Cambodia Gazetteer generated from NCDD Gazetteer Database Online.
-- Source: https://db.ncdd.gov.kh/gazetteer/view/index.castle
-- Counts at generation: ${districts.length} districts, ${communes.length} communes, ${villages.length} villages.

begin;

${provinceCodeMap.map(([oldCode,newCode]) => `update public.provinces set code = ${quote(newCode)} where code = ${quote(oldCode)};`).join('\n')}

update public.districts set is_active = false where code !~ '^[0-9]{4}$';
update public.communes set is_active = false where code !~ '^[0-9]{6}$';
update public.villages set is_active = false where code !~ '^[0-9]{8}$';

insert into public.districts(province_id, code, name_kh, name_en)
select province.id, source.code, source.name_kh, source.name_en
from (values
${valuesSql(districts.map(row => [row.province_code, row.code, row.name_kh, row.name_en]))}
) as source(province_code, code, name_kh, name_en)
join public.provinces province on province.code = source.province_code
on conflict (code) do update set province_id = excluded.province_id, name_kh = excluded.name_kh, name_en = excluded.name_en, is_active = true;

insert into public.communes(district_id, code, name_kh, name_en)
select district.id, source.code, source.name_kh, source.name_en
from (values
${valuesSql(communes.map(row => [row.district_code, row.code, row.name_kh, row.name_en]))}
) as source(district_code, code, name_kh, name_en)
join public.districts district on district.code = source.district_code
on conflict (code) do update set district_id = excluded.district_id, name_kh = excluded.name_kh, name_en = excluded.name_en, is_active = true;

insert into public.villages(commune_id, code, name_kh, name_en)
select commune.id, source.code, source.name_kh, source.name_en
from (values
${valuesSql(villages.map(row => [row.commune_code, row.code, row.name_kh, row.name_en]))}
) as source(commune_code, code, name_kh, name_en)
join public.communes commune on commune.code = source.commune_code
on conflict (code) do update set commune_id = excluded.commune_id, name_kh = excluded.name_kh, name_en = excluded.name_en, is_active = true;

commit;
`

await writeFile(output, sql)
process.stdout.write(`Generated ${output.pathname}\nDistricts: ${districts.length}\nCommunes: ${communes.length}\nVillages: ${villages.length}\n`)
