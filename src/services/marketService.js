import { supabase } from './supabase'

const marketSelect = `
  *,
  market_type:market_types(id,code,name_kh,name_en),
  province:provinces(id,code,name_kh,name_en),
  district:districts(id,code,name_kh,name_en),
  commune:communes(id,code,name_kh,name_en),
  village:villages(id,code,name_kh,name_en),
  creator:profiles!markets_created_by_fkey(id,full_name),
  updater:profiles!markets_updated_by_fkey(id,full_name)
`

const writableFields = [
  'name_kh', 'name_en', 'market_type_id', 'status', 'opening_date',
  'province_id', 'district_id', 'commune_id', 'village_id', 'street',
  'full_address', 'latitude', 'longitude', 'manager_name', 'phone', 'email',
  'opening_time', 'closing_time', 'total_stalls', 'occupied_stalls',
  'trader_count', 'market_size', 'description', 'image',
]

const cleanPayload = payload => Object.fromEntries(
  writableFields
    .filter(field => Object.hasOwn(payload, field))
    .map(field => [field, payload[field] === '' ? null : payload[field]]),
)

const cleanSearch = value => value.trim().replace(/[,%()]/g, ' ')

const compressImage = file => new Promise((resolve, reject) => {
  const image = new Image()
  const url = URL.createObjectURL(file)
  image.onload = () => {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => { URL.revokeObjectURL(url); blob ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })) : reject(new Error('មិនអាចបង្រួមរូបភាពបាន')) }, 'image/webp', 0.82)
  }
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('រូបភាពមិនត្រឹមត្រូវ')) }
  image.src = url
})

export const validateMarket = payload => {
  const errors = {}
  if (!payload.name_kh?.trim()) errors.name_kh = 'សូមបញ្ចូលឈ្មោះផ្សារជាភាសាខ្មែរ'
  if (!payload.market_type_id) errors.market_type_id = 'សូមជ្រើសប្រភេទផ្សារ'
  if (!payload.status) errors.status = 'សូមជ្រើសស្ថានភាព'
  if (!payload.province_id) errors.province_id = 'សូមជ្រើសរាជធានី/ខេត្ត'
  if (!payload.district_id) errors.district_id = 'សូមជ្រើសក្រុង/ស្រុក/ខណ្ឌ'
  if (!payload.commune_id) errors.commune_id = 'សូមជ្រើសឃុំ/សង្កាត់'
  const latitude = Number(payload.latitude)
  const longitude = Number(payload.longitude)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = 'Latitude ត្រូវស្ថិតនៅចន្លោះ -90 និង 90'
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = 'Longitude ត្រូវស្ថិតនៅចន្លោះ -180 និង 180'
  if (payload.phone && !/^(\+?855|0)[1-9][0-9]{7,8}$/.test(payload.phone)) errors.phone = 'លេខទូរស័ព្ទមិនត្រឹមត្រូវ'
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.email = 'Email មិនត្រឹមត្រូវ'
  if (Number(payload.total_stalls || 0) < Number(payload.occupied_stalls || 0)) errors.occupied_stalls = 'ចំនួនតូបដែលបានប្រើមិនអាចលើសចំនួនតូបសរុប'
  if (payload.opening_time && payload.closing_time && payload.closing_time <= payload.opening_time) errors.closing_time = 'ម៉ោងបិទត្រូវនៅក្រោយម៉ោងបើក'
  return errors
}

export const marketService = {
  list({
    page = 1,
    pageSize = 10,
    search = '',
    provinceId = '',
    districtId = '',
    communeId = '',
    marketTypeId = '',
    status = '',
    sortBy = 'created_at',
    ascending = false,
    deleted = 'active',
  } = {}) {
    const allowedSorts = new Set(['market_code', 'name_kh', 'status', 'created_at', 'total_stalls'])
    const sortColumn = allowedSorts.has(sortBy) ? sortBy : 'created_at'
    const start = (Math.max(page, 1) - 1) * pageSize
    let query = supabase.from('markets').select(marketSelect, { count: 'exact' })
    if (deleted === 'active') query = query.is('deleted_at', null)
    if (deleted === 'deleted') query = query.not('deleted_at', 'is', null)
    if (search.trim()) {
      const term = cleanSearch(search)
      query = query.or(`market_code.ilike.%${term}%,name_kh.ilike.%${term}%,name_en.ilike.%${term}%,manager_name.ilike.%${term}%,phone.ilike.%${term}%`)
    }
    if (provinceId) query = query.eq('province_id', provinceId)
    if (districtId) query = query.eq('district_id', districtId)
    if (communeId) query = query.eq('commune_id', communeId)
    if (marketTypeId) query = query.eq('market_type_id', marketTypeId)
    if (status) query = query.eq('status', status)
    return query.order(sortColumn, { ascending }).range(start, start + pageSize - 1)
  },

  get(id) {
    return supabase.from('markets').select(marketSelect).eq('id', id).single()
  },

  create(payload) {
    return supabase.from('markets').insert(cleanPayload(payload)).select(marketSelect).single()
  },

  update(id, payload) {
    return supabase.from('markets').update(cleanPayload(payload)).eq('id', id).is('deleted_at', null).select(marketSelect).single()
  },

  async remove(id) {
    return supabase.rpc('soft_delete_market', { p_market_id: id })
  },

  restore(id) {
    return supabase.rpc('restore_market', { p_market_id: id })
  },

  changeStatus(id, { status, reason = null, effectiveDate = null, referenceDocument = null }) {
    return supabase.rpc('change_market_status', { p_market_id: id, p_status: status, p_reason: reason, p_effective_date: effectiveDate, p_reference_document: referenceDocument })
  },

  statusHistory(id) {
    return supabase.from('market_status_histories').select('*,changer:profiles!market_status_histories_changed_by_fkey(id,full_name)').eq('market_id', id).order('changed_at', { ascending: false })
  },

  stalls(id) {
    return supabase.from('market_stalls').select('*').eq('market_id', id).order('stall_code')
  },

  createStall(payload) {
    return supabase.from('market_stalls').insert(payload).select().single()
  },

  updateStall(id, payload) {
    return supabase.from('market_stalls').update(payload).eq('id', id).select().single()
  },

  removeStall(id) {
    return supabase.from('market_stalls').delete().eq('id', id)
  },

  logImport(payload) {
    return supabase.from('market_import_logs').insert(payload).select().single()
  },

  auditLogs(id) {
    return supabase.from('market_audit_logs').select('*,actor:profiles!market_audit_logs_actor_id_fkey(id,full_name)').eq('market_id', id).order('created_at', { ascending: false })
  },

  statistics() {
    return supabase.rpc('market_statistics')
  },

  async uploadImage(file, marketId = crypto.randomUUID()) {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(file.type)) return { data: null, error: new Error('រូបភាពត្រូវជា JPG, PNG ឬ WebP') }
    if (file.size > 5 * 1024 * 1024) return { data: null, error: new Error('ទំហំរូបភាពត្រូវតិចជាង 5 MB') }
    const optimizedFile = await compressImage(file)
    const extension = optimizedFile.name.split('.').pop()?.toLowerCase() || 'webp'
    const path = `${marketId}/${crypto.randomUUID()}.${extension}`
    const result = await supabase.storage.from('market-images').upload(path, optimizedFile, { cacheControl: '3600', upsert: false, contentType: optimizedFile.type })
    if (result.error) return result
    const { data } = supabase.storage.from('market-images').getPublicUrl(path)
    return { data: { path, publicUrl: data.publicUrl }, error: null }
  },

  removeImage(path) {
    return supabase.storage.from('market-images').remove([path])
  },

  imageUrl(path) {
    if (!path) return null
    if (/^https?:\/\//.test(path)) return path
    return supabase.storage.from('market-images').getPublicUrl(path).data.publicUrl
  },
}
