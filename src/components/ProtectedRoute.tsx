import { useAuthStore } from '../stores/auth-store'
import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { isAnonymousModeEnabled } from '../lib/environment'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isAnonymousMode } = useAuthStore()

  // In anonymous mode, always allow access
  if (isAnonymousModeEnabled() || isAnonymousMode) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

