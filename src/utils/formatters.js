import { format, isToday, isPast } from 'date-fns'
import { km } from 'date-fns/locale'

export const formatDate = (value, pattern = 'dd MMM yyyy, HH:mm') => value ? format(new Date(value), pattern, { locale: km }) : '—'
export const toLocalInput = (value) => value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''
export const followUpTone = (value, status) => {
  if (!value || status === 'completed') return 'slate'
  const date = new Date(value)
  if (isToday(date)) return 'orange'
  if (isPast(date)) return 'red'
  return 'blue'
}
export const normalizePhone = (value = '') => value.replace(/[\s()-]/g, '')
export const isValidPhone = (value) => /^(?:\+?855|0)[1-9]\d{7,8}$/.test(normalizePhone(value))
export const sanitizeText = (value = '') => value.replace(/[<>]/g, '').trim()
