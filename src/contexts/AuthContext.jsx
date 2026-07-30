import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { LEGACY_PERMISSION_ALIASES } from '../utils/permissions'

const AuthContext = createContext(null)
const USERNAME_EMAIL_DOMAIN = 'users.crm.local'
const AUTH_STARTUP_TIMEOUT_MS = 8000

const withTimeout = (promise, ms = AUTH_STARTUP_TIMEOUT_MS) => Promise.race([
  promise,
  new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), ms)),
])

const usernameToEmail = value => {
  const login = value.trim().toLowerCase()
  return login.includes('@') ? login : `${login}@${USERNAME_EMAIL_DOMAIN}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return }
    const fallback = { id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email, role: 'sales' }
    const result = await withTimeout(supabase.from('profiles').select('*,app_role:app_roles!profiles_role_fkey(name,permissions)').eq('id', user.id).single())
    setProfile(result?.data || fallback)
  }, [])

  useEffect(() => {
    withTimeout(supabase.auth.getSession()).then(({ data } = {}) => {
      setSession(data?.session || null)
      return loadProfile(data?.session?.user)
    }).catch(() => {
      setSession(null)
      setProfile(null)
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
    hasPermission: permission => {
      if (profile?.role === 'admin') return true
      const permissions = profile?.app_role?.permissions || profile?.permissions || []
      if (permissions.includes(permission)) return true
      const wildcardPermission = `${permission.split('.')[0]}.*`
      if (permissions.includes(wildcardPermission)) return true
      const nestedWildcardPermission = permission.split('.').slice(0, -1).join('.')
      if (nestedWildcardPermission && permissions.includes(`${nestedWildcardPermission}.*`)) return true
      const modernPermission = LEGACY_PERMISSION_ALIASES[permission]
      if (modernPermission && permissions.includes(modernPermission)) return true
      const legacyPermission = Object.entries(LEGACY_PERMISSION_ALIASES).find(([, modern]) => modern === permission)?.[0]
      return Boolean(legacyPermission && permissions.includes(legacyPermission))
    },
    signIn: (username, password) => supabase.auth.signInWithPassword({
      email: usernameToEmail(username), password,
    }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: () => loadProfile(session?.user),
  }), [session, profile, loading, loadProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
