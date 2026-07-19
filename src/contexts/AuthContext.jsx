import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data || { id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email, role: 'sales' })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      return loadProfile(data.session?.user)
    }).finally(() => setLoading(false))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      loadProfile(next?.user).finally(() => setLoading(false))
    })
    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const value = useMemo(() => ({
    session, user: session?.user || null, profile, loading,
    isAdmin: profile?.role === 'admin',
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: () => loadProfile(session?.user),
  }), [session, profile, loading, loadProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
