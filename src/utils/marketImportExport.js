import { marketLookupService } from '../services/marketLookupService'
import { marketService, validateMarket } from '../services/marketService'
import { MARKET_STATUSES } from './marketConstants'

const headers = [
  'name_kh', 'name_en', 'market_type_code', 'status', 'opening_date', 'province_code',
  'district_code', 'commune_code', 'village_code', 'street', 'full_address', 'latitude',
  'longitude', 'manager_name', 'phone', 'email', 'opening_time', 'closing_time',
  'total_stalls', 'occupied_stalls', 'trader_count', 'market_size', 'description',
]

const loadExcel = async () => {
  const module = await import('exceljs')
  return module.default || module
}

const downloadWorkbook = async (rows, filename, sheetName = 'Markets', columns = headers) => {
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)
  sheet.columns = columns.map(header => ({ header, key: header, width: Math.max(header.length + 2, 16) }))
  ;['phone', 'market_type_code', 'province_code', 'district_code', 'commune_code', 'village_code'].forEach(key => {
    if (columns.includes(key)) sheet.getColumn(key).numFmt = '@'
  })
  sheet.addRows(rows)
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  const buffer = await workbook.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  URL.revokeObjectURL(url)
}

const collectMarkets = async filters => {
  const rows = []
  let page = 1
  while (true) {
    const result = await marketService.list({ ...filters, page, pageSize: 500 })
    if (result.error) throw result.error
    rows.push(...(result.data || []))
    if (!result.data?.length || rows.length >= (result.count || 0)) break
    page += 1
  }
  return rows
}

export const marketImportExport = {
  async downloadTemplate() {
    await downloadWorkbook([{
      name_kh: 'ផ្សារគំរូ', name_en: 'Sample Market', market_type_code: 'public_market', status: 'active',
      opening_date: '2026-01-01', province_code: 'PP', district_code: 'D001', commune_code: 'C001',
      village_code: '', street: 'ផ្លូវ ១', full_address: '', latitude: 11.5564, longitude: 104.9282,
      manager_name: 'ឈ្មោះអ្នកគ្រប់គ្រង', phone: '012345678', email: 'manager@example.com',
      opening_time: '06:00', closing_time: '18:00', total_stalls: 100, occupied_stalls: 80,
      trader_count: 80, market_size: 2500, description: 'ព័ត៌មានបន្ថែម',
    }], 'market-import-template.xlsx', 'Template')
  },

  async parseImport(file) {
    const ExcelJS = await loadExcel()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new Error('Excel File មិនមាន Worksheet')
    const columns = sheet.getRow(1).values.slice(1).map(value => String(value || '').trim())
    const rows = []
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const source = Object.fromEntries(columns.map((column,index) => [column, row.getCell(index + 1).text.trim()]))
      if (Object.values(source).some(value => value !== '')) rows.push(source)
    })
    const [types, provinces, districts, communes, villages] = await Promise.all([
      marketLookupService.marketTypes(), marketLookupService.provinces(), marketLookupService.allDistricts(),
      marketLookupService.allCommunes(), marketLookupService.allVillages(),
    ])
    const byCode = result => new Map((result.data || []).map(item => [String(item.code).toLowerCase(), item]))
    const maps = { types: byCode(types), provinces: byCode(provinces), districts: byCode(districts), communes: byCode(communes), villages: byCode(villages) }
    return rows.map((row, index) => {
      const type = maps.types.get(String(row.market_type_code).toLowerCase())
      const province = maps.provinces.get(String(row.province_code).toUpperCase().toLowerCase())
      const district = maps.districts.get(String(row.district_code).toLowerCase())
      const commune = maps.communes.get(String(row.commune_code).toLowerCase())
      const village = row.village_code ? maps.villages.get(String(row.village_code).toLowerCase()) : null
      const payload = {
        name_kh: String(row.name_kh || '').trim(), name_en: String(row.name_en || '').trim() || null,
        market_type_id: type?.id || '', status: String(row.status || '').toLowerCase(), opening_date: row.opening_date || null,
        province_id: province?.id || '', district_id: district?.id || '', commune_id: commune?.id || '', village_id: village?.id || null,
        street: String(row.street || '').trim() || null, full_address: String(row.full_address || '').trim() || null,
        latitude: Number(row.latitude), longitude: Number(row.longitude), manager_name: String(row.manager_name || '').trim() || null,
        phone: String(row.phone || '').trim() || null, email: String(row.email || '').trim() || null,
        opening_time: row.opening_time || null, closing_time: row.closing_time || null,
        total_stalls: Number(row.total_stalls || 0), occupied_stalls: Number(row.occupied_stalls || 0),
        trader_count: Number(row.trader_count || 0), market_size: row.market_size === '' ? null : Number(row.market_size),
        description: String(row.description || '').trim() || null,
      }
      const validation = validateMarket(payload)
      if (!type) validation.market_type_code = 'Market Type Code មិនត្រឹមត្រូវ'
      if (!province) validation.province_code = 'Province Code មិនត្រឹមត្រូវ'
      if (!district || district.province_id !== province?.id) validation.district_code = 'District មិនស្ថិតក្នុង Province ដែលបានជ្រើស'
      if (!commune || commune.district_id !== district?.id) validation.commune_code = 'Commune មិនស្ថិតក្នុង District ដែលបានជ្រើស'
      if (village && village.commune_id !== commune?.id) validation.village_code = 'Village មិនស្ថិតក្នុង Commune ដែលបានជ្រើស'
      if (!MARKET_STATUSES.some(([value]) => value === payload.status)) validation.status = 'Status មិនត្រឹមត្រូវ'
      return { row: index + 2, source: row, payload, errors: Object.values(validation), valid: Object.keys(validation).length === 0 }
    })
  },

  async importRows(previewRows, onProgress) {
    const validRows = previewRows.filter(row => row.valid)
    const results = new Array(validRows.length)
    let nextIndex = 0
    let completed = 0
    const workers = Array.from({ length: Math.min(5, validRows.length) }, async () => {
      while (nextIndex < validRows.length) {
        const index = nextIndex; nextIndex += 1
        const row = validRows[index]
        const result = await marketService.create(row.payload)
        results[index] = { ...row, error: result.error?.message || null, data: result.data }
        completed += 1; onProgress?.(completed, validRows.length)
      }
    })
    await Promise.all(workers)
    return results
  },

  async exportExcel(filters) {
    const markets = await collectMarkets(filters)
    const rows = markets.map(market => ({
      market_code: market.market_code, name_kh: market.name_kh, name_en: market.name_en,
      market_type: market.market_type?.name_kh, status: MARKET_STATUSES.find(([value]) => value === market.status)?.[1],
      province: market.province?.name_kh, district: market.district?.name_kh, commune: market.commune?.name_kh,
      manager_name: market.manager_name, phone: market.phone, total_stalls: market.total_stalls,
      occupied_stalls: market.occupied_stalls, trader_count: market.trader_count, created_at: market.created_at,
    }))
    await downloadWorkbook(rows, `markets-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Markets', Object.keys(rows[0] || { market_code: '' }))
  },

  async exportPdf(filters) {
    const [{ jsPDF }, html2canvasModule] = await Promise.all([import('jspdf'), import('html2canvas')])
    const html2canvas = html2canvasModule.default
    const markets = await collectMarkets(filters)
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;left:-10000px;top:0;width:1120px;padding:32px;background:white;color:#1e293b;font-family:"Noto Sans Khmer",sans-serif'
    container.innerHTML = `<h1 style="font-size:24px;margin:0 0 6px">បញ្ជីព័ត៌មានផ្សារ</h1><p style="color:#64748b;margin:0 0 20px">កាលបរិច្ឆេទនាំចេញ: ${new Date().toLocaleDateString('km-KH')}</p><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${['ល.រ','លេខកូដ','ឈ្មោះផ្សារ','ខេត្ត','ប្រភេទ','ស្ថានភាព','អ្នកគ្រប់គ្រង','ទូរស័ព្ទ'].map(value => `<th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#eff6ff">${value}</th>`).join('')}</tr></thead><tbody>${markets.map((market,index) => `<tr>${[index + 1, market.market_code, market.name_kh, market.province?.name_kh || '', market.market_type?.name_kh || '', MARKET_STATUSES.find(([value]) => value === market.status)?.[1] || '', market.manager_name || '', market.phone || ''].map(value => `<td style="border:1px solid #cbd5e1;padding:7px">${String(value).replace(/[<>&]/g, '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    document.body.appendChild(container)
    await document.fonts?.ready
    const canvas = await html2canvas(container, { scale: 1.5, backgroundColor: '#ffffff' })
    container.remove()
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = 277
    const pageHeight = 190
    const imageHeight = canvas.height * pageWidth / canvas.width
    let offset = 0
    while (offset < imageHeight) {
      if (offset > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10 - offset, pageWidth, imageHeight)
      offset += pageHeight
    }
    pdf.save(`markets-${new Date().toISOString().slice(0, 10)}.pdf`)
  },
}
