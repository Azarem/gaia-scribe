import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth-store'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectSectionPage from './pages/ProjectSectionPage'
import AuthCallback from './pages/AuthCallback'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Handle GitHub Pages SPA redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const redirectPath = urlParams.get('redirect')

    if (redirectPath) {
      // Remove the redirect parameter from the URL and navigate to the intended path
      const newUrl = window.location.origin + window.location.pathname + window.location.hash
      window.history.replaceState({}, '', newUrl)
      navigate(redirectPath, { replace: true })
    }
  }, [navigate])

  // Auth state management is handled in auth-store.ts
  // No need to duplicate it here

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        <Route 
          path="/auth/callback" 
          element={<AuthCallback />} 
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={<ProjectDetailPage />}
        />
        <Route
          path="/project/:id/:section"
          element={
            <ProtectedRoute>
              <ProjectSectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={user ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </div>
  )
}

export default App

