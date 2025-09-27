import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth-store'
import { useArtifactViewerStore } from './stores/artifact-viewer-store'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectSectionPage from './pages/ProjectSectionPage'
import PlatformPage from './pages/PlatformPage'
import PlatformDetailPage from './pages/PlatformDetailPage'
import PlatformSectionPage from './pages/PlatformSectionPage'
import AuthCallback from './pages/AuthCallback'
import ProtectedRoute from './components/ProtectedRoute'
import ArtifactViewerPanel from './components/ArtifactViewerPanel'

// Handle GitHub Pages SPA redirect (rafgraph/spa-github-pages solution)
// CRITICAL: This must run immediately at module level, before React routing
(function(l) {
  if (l.search[1] === '/' ) {
    const decoded = l.search.slice(1).split('&').map(function(s) {
      return s.replace(/~and~/g, '&')
    }).join('?');

    console.log('SPA Redirect: Processing redirect from', l.href)
    console.log('SPA Redirect: Original search:', l.search)
    console.log('SPA Redirect: Decoded path:', decoded)
    console.log('SPA Redirect: Hash fragment:', l.hash)
    console.log('SPA Redirect: Original pathname:', l.pathname)

    // FIXED: Correct rafgraph implementation
    // When we get /?/auth/callback, we want to restore /auth/callback
    // l.pathname is '/', decoded is '/auth/callback', so we want just decoded + hash
    const newUrl = decoded + l.hash
    console.log('SPA Redirect: New URL:', newUrl)

    window.history.replaceState(null, '', newUrl);
    console.log('SPA Redirect: URL updated to:', window.location.href)
  }
}(window.location))

function App() {
  const { user } = useAuthStore()
  const { isOpen, width, temporaryWidth } = useArtifactViewerStore()

  // Auth state management is handled in auth-store.ts
  // No need to duplicate it here

  // Calculate the current display width for the push-aside layout
  const displayWidth = temporaryWidth !== null ? temporaryWidth : width

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content Area */}
      <div
        className="flex-1 transition-all duration-300 ease-in-out overflow-hidden"
      >
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
            path="/platforms"
            element={
              <ProtectedRoute>
                <PlatformPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platforms/:id"
            element={<PlatformDetailPage />}
          />
          <Route
            path="/platforms/:id/:section"
            element={
              <ProtectedRoute>
                <PlatformSectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<Navigate to={user ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </div>

      {/* Global Artifact Viewer Panel */}
      <ArtifactViewerPanel />
    </div>
  )
}

export default App

