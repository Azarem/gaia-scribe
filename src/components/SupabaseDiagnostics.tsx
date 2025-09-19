import { useState, useEffect } from 'react'
import { supabase, createFreshSupabaseClient } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'

export default function SupabaseDiagnostics() {
  const { user, session } = useAuthStore()
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    runDiagnostics()
  }, [user, session])

  const runDiagnostics = async () => {
    console.log('🔍 Running Supabase diagnostics...')

    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: import.meta.env.VITE_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
        anonKeyLength: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        anonKeyPrefix: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      },
      authStore: {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasSession: !!session,
        sessionExpiry: session?.expires_at,
        accessTokenLength: session?.access_token?.length || 0,
        refreshTokenLength: session?.refresh_token?.length || 0,
      },
      supabaseClient: {
        isInitialized: !!supabase,
        hasAuth: !!supabase?.auth,
        hasFrom: !!supabase?.from,
        hasRealtime: !!supabase?.realtime,
      }
    }

    // FIXED: Don't call getSession() directly - use auth store data instead
    // This prevents the hanging bug caused by direct getSession() calls
    console.log('Using session data from auth store (avoiding direct getSession call)...')
    results.directSession = {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      accessTokenLength: session?.access_token?.length || 0,
      note: 'Using auth store data to avoid getSession() hanging bug',
    }
    console.log('Session data from auth store:', results.directSession)

    setDiagnostics(results)
    console.log('🔍 Diagnostics results:', results)
  }

  const testBasicConnectivity = async () => {
    setLoading(true)
    setTestResults({})
    
    const tests: any = {}
    
    console.log('🧪 Testing basic Supabase connectivity...')

    // Test 1: Unauthenticated request (should work with anon key) - with timeout
    try {
      console.log('Test 1: Unauthenticated query...')
      const start = Date.now()

      const queryPromise = supabase
        .from('ScribeProject')
        .select('id')
        .eq('isPublic', true)
        .limit(1)

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Test 1 timeout after 5 seconds')), 5000)
      )

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      tests.unauthenticatedQuery = {
        success: !error,
        duration: Date.now() - start,
        dataCount: data?.length || 0,
        error: error?.message,
      }
      console.log('Test 1 result:', tests.unauthenticatedQuery)
    } catch (error) {
      tests.unauthenticatedQuery = {
        success: false,
        error: (error as Error).message,
      }
      console.error('Test 1 failed:', error)
    }

    // Test 2: Simple authenticated request
    try {
      console.log('Test 2: Authenticated query...')
      const start = Date.now()
      const { data, error } = await supabase
        .from('User')
        .select('id')
        .limit(1)
      
      tests.authenticatedQuery = {
        success: !error,
        duration: Date.now() - start,
        dataCount: data?.length || 0,
        error: error?.message,
      }
      console.log('Test 2 result:', tests.authenticatedQuery)
    } catch (error) {
      tests.authenticatedQuery = {
        success: false,
        error: (error as Error).message,
      }
      console.error('Test 2 failed:', error)
    }

    // Test 3: User-specific query (what's actually failing)
    if (user?.id) {
      try {
        console.log('Test 3: User-specific query...')
        const start = Date.now()
        const { data, error } = await supabase
          .from('ScribeProject')
          .select('id')
          .eq('createdBy', user.id)
          .limit(1)
        
        tests.userSpecificQuery = {
          success: !error,
          duration: Date.now() - start,
          dataCount: data?.length || 0,
          error: error?.message,
        }
        console.log('Test 3 result:', tests.userSpecificQuery)
      } catch (error) {
        tests.userSpecificQuery = {
          success: false,
          error: (error as Error).message,
        }
        console.error('Test 3 failed:', error)
      }
    }

    // Test 4: Direct HTTP request to bypass Supabase client (with timeout)
    try {
      console.log('Test 4: Direct HTTP request...')
      const start = Date.now()

      const fetchPromise = fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/rest/v1/ScribeProject?select=id&isPublic=eq.true&limit=1`,
        {
          headers: {
            'apikey': import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`,
          }
        }
      )

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Direct HTTP timeout after 5 seconds')), 5000)
      )

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
      const data = await response.json()

      tests.directHttpRequest = {
        success: response.ok,
        duration: Date.now() - start,
        status: response.status,
        dataCount: Array.isArray(data) ? data.length : 0,
        error: !response.ok ? data.message : null,
        responseData: data,
      }
      console.log('Test 4 result:', tests.directHttpRequest)
    } catch (error) {
      tests.directHttpRequest = {
        success: false,
        error: (error as Error).message,
      }
      console.error('Test 4 failed:', error)
    }

    // Test 5: Fresh Supabase client test
    try {
      console.log('Test 5: Fresh Supabase client...')
      const start = Date.now()

      const freshClient = createFreshSupabaseClient()

      const queryPromise = freshClient
        .from('ScribeProject')
        .select('id')
        .eq('isPublic', true)
        .limit(1)

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fresh client timeout after 5 seconds')), 5000)
      )

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      tests.freshClient = {
        success: !error,
        duration: Date.now() - start,
        dataCount: data?.length || 0,
        error: error?.message,
      }
      console.log('Test 5 result:', tests.freshClient)
    } catch (error) {
      tests.freshClient = {
        success: false,
        error: (error as Error).message,
      }
      console.error('Test 5 failed:', error)
    }

    // Test 6: Basic network connectivity test
    try {
      console.log('Test 6: Basic network connectivity...')
      const start = Date.now()

      const fetchPromise = fetch('https://httpbin.org/get')
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network test timeout after 5 seconds')), 5000)
      )

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
      await response.json() // Just validate response is JSON

      tests.networkConnectivity = {
        success: response.ok,
        duration: Date.now() - start,
        status: response.status,
        canReachInternet: true,
      }
      console.log('Test 6 result:', tests.networkConnectivity)
    } catch (error) {
      tests.networkConnectivity = {
        success: false,
        canReachInternet: false,
        error: (error as Error).message,
      }
      console.error('Test 6 failed:', error)
    }

    setTestResults(tests)
    setLoading(false)
    console.log('🧪 All tests completed:', tests)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">🔍 Supabase Diagnostics</h2>
      
      <div className="space-y-4">
        <button
          onClick={testBasicConnectivity}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run Connectivity Tests'}
        </button>

        {Object.keys(diagnostics).length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">📊 System Diagnostics</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        )}

        {Object.keys(testResults).length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">🧪 Connectivity Test Results</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
