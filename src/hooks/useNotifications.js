import { useCallback, useEffect, useState } from 'react'
import { isPast, isToday } from 'date-fns'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

const getPermission = () => 'Notification' in window ? Notification.permission : 'unsupported'

export function useNotifications() {
  const { user, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [permission, setPermission] = useState(getPermission)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    await supabase.rpc('sync_due_notifications')
    let query = supabase.from('notifications').select('*, customer:customers(name,phone), recipient:profiles!notifications_user_id_fkey(full_name)').order('created_at', { ascending: false }).limit(100)
    if (!isAdmin) query = query.eq('user_id', user.id)
    const { data } = await query
    const nextItems = data || []
    setItems(nextItems)

    if ('Notification' in window && Notification.permission === 'granted') {
      const pending = nextItems.filter(item => !item.notified_at && item.notification_type === 'follow_up' && item.customer)
      for (const item of pending) {
        const now = new Date().toISOString()
        const { data: claimed } = await supabase.from('notifications').update({ notified_at: now }).eq('id', item.id).is('notified_at', null).select('id')
        if (claimed?.length) {
          try { new Notification(item.title, { body:item.message, tag:item.id, icon:'/favicon.ico' }) }
          catch { await supabase.from('notifications').update({ notified_at:null }).eq('id', item.id) }
        }
      }
    }
    setLoading(false)
  }, [user, isAdmin])

  useEffect(() => {
    load()
    const interval = window.setInterval(load, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    if (!user) return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
    const channel = supabase.channel(`notification-center-${user.id}-${Date.now()}`).on('postgres_changes', { event:'*', schema:'public', table:'notifications' }, load).subscribe()
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); supabase.removeChannel(channel) }
  }, [load, user])

  const requestPermission = async () => {
    if (!('Notification' in window)) { setPermission('unsupported'); return 'unsupported' }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') load()
    return result
  }
  const sendTestNotification = async () => {
    const result = Notification.permission === 'granted' ? 'granted' : await requestPermission()
    if (result === 'granted') {
      new Notification('ShadowPV Notification', { body:'ការជូនដំណឹងដំណើរការត្រឹមត្រូវ!', tag:'shadowpv-test' })
      return true
    }
    return false
  }
  const markRead = async id => { await supabase.from('notifications').update({ is_read:true }).eq('id',id); load() }
  const markAllRead = async () => {
    const ids = items.filter(item => !item.is_read).map(item => item.id)
    if (ids.length) await supabase.from('notifications').update({ is_read:true }).in('id',ids)
    load()
  }
  return { items, unread:items.filter(item => !item.is_read).length, loading, permission, load, requestPermission, sendTestNotification, markRead, markAllRead, isDue:date => isToday(new Date(date)) || isPast(new Date(date)) }
}
