import { useCallback, useEffect, useState } from 'react'
import { isPast, isToday } from 'date-fns'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const load = useCallback(async () => {
    if (!user) return
    await supabase.rpc('sync_due_notifications')
    const { data } = await supabase.from('notifications').select('*, customer:customers(name,phone)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setItems(data || [])
    const due = (data || []).filter(n => !n.notified_at && n.notification_type === 'follow_up' && n.customer)
    if (due.length && 'Notification' in window && Notification.permission === 'granted') {
      due.forEach(n => new Notification(n.title, { body: n.message, tag: n.id }))
      await supabase.from('notifications').update({ notified_at: new Date().toISOString() }).in('id', due.map(n => n.id))
    }
  }, [user])
  useEffect(() => { load() }, [load])
  const requestPermission = () => 'Notification' in window ? Notification.requestPermission() : Promise.resolve('unsupported')
  const markRead = async (id) => { await supabase.from('notifications').update({ is_read: true }).eq('id', id); load() }
  return { items, unread: items.filter(i => !i.is_read).length, load, requestPermission, markRead, isDue: date => isToday(new Date(date)) || isPast(new Date(date)) }
}
