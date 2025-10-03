import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { db } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuthStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('=== AuthCallback: Starting OAuth callback processing ===')

        // Check for OAuth errors in URL (both query params and hash)
        const urlParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))

        const errorParam = urlParams.get('error') || hashParams.get('error')
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description')

        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription)
          setError(`Authentication failed: ${errorDescription || errorParam}`)
          setTimeout(() => navigate('/login?error=oauth_failed'), 2000)
          return
        }

        // Supabase automatically processes tokens due to detectSessionInUrl: true
        // Just wait for auth state to update via the store
        console.log('AuthCallback: Waiting for Supabase to process session...')

        let attempts = 0
        const maxAttempts = 20 // 10 seconds total

        const checkAuthState = async () => {
          attempts++
          console.log(`AuthCallback: Checking auth state (attempt ${attempts})`)

          if (session && user) {
            console.log('AuthCallback: Authentication successful, syncing user')
            const { data, error } = await db.users.syncFromAuth(session.user)

            if (error) {
              console.error('AuthCallback: Error syncing user:', error)
            } else {
              console.log('AuthCallback: User synced successfully:', data)
            }
            navigate('/dashboard')
            return
          }

          if (attempts >= maxAttempts) {
            console.error('AuthCallback: Timeout waiting for authentication')
            setError('Authentication timeout - please try again')
            setTimeout(() => navigate('/login?error=auth_timeout'), 2000)
            return
          }

          setTimeout(checkAuthState, 500)
        }

        // Start checking immediately
        checkAuthState()

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

