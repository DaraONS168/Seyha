import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingState from './LoadingState'
export default function AdminRoute({ children }) { const { isAdmin, loading } = useAuth(); if (loading) return <LoadingState/>; return isAdmin ? children : <Navigate to="/" replace/> }
