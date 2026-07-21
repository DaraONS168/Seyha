import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingState from './LoadingState'

export default function PermissionRoute({ permission, children }) {
  const { hasPermission, loading } = useAuth()
  if (loading) return <LoadingState/>
  return hasPermission(permission) ? children : <Navigate to="/" replace/>
}
