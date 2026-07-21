export const STATUSES = [
  ['new_lead', 'អតិថិជនថ្មី'], ['pending_follow_up', 'រង់ចាំ Follow Up'], ['contacted', 'បានទាក់ទង'],
  ['interested', 'ចាប់អារម្មណ៍'], ['not_interested', 'មិនចាប់អារម្មណ៍'], ['no_answer', 'មិនលើកទូរស័ព្ទ'],
  ['call_back_later', 'ហៅពេលក្រោយ'], ['converted', 'បានបំប្លែង'], ['cancelled', 'បានបោះបង់'],
]
export const PRIORITIES = [['low', 'ទាប'], ['medium', 'មធ្យម'], ['high', 'ខ្ពស់'], ['urgent', 'បន្ទាន់']]
export const SOURCES = [['facebook', 'Facebook'], ['telegram', 'Telegram'], ['tiktok', 'TikTok'], ['website', 'Website'], ['referral', 'ណែនាំ'], ['walk_in', 'Walk-in'], ['other', 'ផ្សេងៗ']]
export const CALL_RESULTS = [['answered', 'បានលើក'], ['no_answer', 'មិនលើក'], ['busy', 'រវល់'], ['wrong_number', 'លេខខុស'], ['interested', 'ចាប់អារម្មណ៍'], ['not_interested', 'មិនចាប់អារម្មណ៍'], ['call_back_later', 'ហៅពេលក្រោយ'], ['converted', 'បានបំប្លែង']]
export const PROVINCES = ['ភ្នំពេញ', 'បន្ទាយមានជ័យ', 'បាត់ដំបង', 'កំពង់ចាម', 'កំពង់ឆ្នាំង', 'កំពង់ស្ពឺ', 'កំពង់ធំ', 'កំពត', 'កណ្ដាល', 'កែប', 'កោះកុង', 'ក្រចេះ', 'មណ្ឌលគិរី', 'ឧត្តរមានជ័យ', 'ប៉ៃលិន', 'ព្រះសីហនុ', 'ព្រះវិហារ', 'ពោធិ៍សាត់', 'ព្រៃវែង', 'រតនគិរី', 'សៀមរាប', 'ស្ទឹងត្រែង', 'ស្វាយរៀង', 'តាកែវ', 'ត្បូងឃ្មុំ', 'ផ្សេងៗ']
export const labelOf = (items, value) => items.find(([key]) => key === value)?.[1] || value || '—'
export const STATUS_COLORS = { new_lead: 'bg-blue-50 text-blue-700', pending_follow_up: 'bg-orange-50 text-orange-700', interested: 'bg-emerald-50 text-emerald-700', converted: 'bg-green-100 text-green-800', not_interested: 'bg-slate-100 text-slate-600', no_answer: 'bg-amber-50 text-amber-700', cancelled: 'bg-red-50 text-red-700' }
export const PRIORITY_COLORS = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-50 text-blue-700', high: 'bg-orange-50 text-orange-700', urgent: 'bg-red-100 text-red-700' }
