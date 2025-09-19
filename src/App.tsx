import { Routes, Route, Navigate } from 'react-router-dom'
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

  // Handle GitHub Pages SPA redirect (rafgraph/spa-github-pages solution)
  useEffect(() => {
    // Single Page Apps for GitHub Pages
    // MIT License
    // https://github.com/rafgraph/spa-github-pages
    // This script checks to see if a redirect is present in the query string,
    // converts it back into the correct url and adds it to the
    // browser's history using window.history.replaceState(...),
    // which won't cause the browser to attempt to load the new url.
    // When the single page app is loaded further down in this file,
    // the correct url will be waiting in the browser's history for
    // the single page app to route accordingly.
    (function(l) {
      if (l.search[1] === '/' ) {
        const decoded = l.search.slice(1).split('&').map(function(s) {
          return s.replace(/~and~/g, '&')
        }).join('?');

        console.log('SPA Redirect: Processing redirect from', l.href)
        console.log('SPA Redirect: Decoded path:', decoded)
        console.log('SPA Redirect: Hash fragment:', l.hash)

        // Preserve the hash fragment for auth callbacks
        const newUrl = l.pathname.slice(0, -1) + decoded + l.hash
        console.log('SPA Redirect: New URL:', newUrl)

        window.history.replaceState(null, '', newUrl);
      }
    }(window.location))
  }, [])

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

