import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuthStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('=== AuthCallback: Starting OAuth callback processing ===')
        console.log('Current URL:', window.location.href)
        console.log('Pathname:', window.location.pathname)
        console.log('Search:', window.location.search)
        console.log('Hash fragment:', window.location.hash)
        console.log('Current auth state - user:', user, 'session:', !!session)

        // Check if we have auth tokens in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const errorParam = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        // Handle OAuth errors
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription)
          setError(`Authentication failed: ${errorDescription || errorParam}`)
          setTimeout(() => navigate('/login?error=oauth_failed'), 2000)
          return
        }

        if (accessToken) {
          console.log('AuthCallback: Found auth tokens in URL, waiting for Supabase to process...')

          // Supabase should automatically process the tokens due to detectSessionInUrl: true
          // Wait for the auth state to update via the auth store
          let attempts = 0
          const maxAttempts = 10 // 5 seconds total

          const checkAuthState = () => {
            attempts++
            console.log(`AuthCallback: Checking auth state (attempt ${attempts})`)

            if (session && user) {
              console.log('AuthCallback: Authentication successful, redirecting to dashboard')
              navigate('/dashboard')
              return
            }

            if (attempts >= maxAttempts) {
              console.error('AuthCallback: Timeout waiting for authentication')
              setError('Authentication timeout - please try again')
              setTimeout(() => navigate('/login?error=auth_timeout'), 2000)
              return
            }

            // Check again in 500ms
            setTimeout(checkAuthState, 500)
          }

          // Start checking after a brief delay to let Supabase process
          setTimeout(checkAuthState, 500)

        } else {
          console.log('AuthCallback: No auth tokens in URL, checking existing session...')

          // No tokens in URL, check if we already have a session
          if (session && user) {
            console.log('AuthCallback: Existing session found, redirecting to dashboard')
            navigate('/dashboard')
          } else {
            console.log('AuthCallback: No session and no tokens, redirecting to login')
            navigate('/login')
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setError('Authentication failed - please try again')
        setTimeout(() => navigate('/login?error=auth_callback_failed'), 2000)
      } finally {
        setIsProcessing(false)
      }
    }

    handleAuthCallback()
  }, [navigate, session, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">
              {isProcessing ? 'Processing authentication...' : 'Completing sign-in...'}
            </p>
            <p className="mt-2 text-sm text-gray-500">Please wait while we verify your credentials</p>
          </>
        )}
      </div>
    </div>
  )
}

