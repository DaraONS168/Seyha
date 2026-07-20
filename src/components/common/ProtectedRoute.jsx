import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingState from './LoadingState'
export default function ProtectedRoute({ children }) { const { session, loading } = useAuth(); if (loading) return <div className="min-h-screen"><LoadingState label="កំពុងពិនិត្យគណនី..."/></div>; return session ? children : <Navigate to="/login" replace/> }
