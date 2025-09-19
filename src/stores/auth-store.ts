import { create } from 'zustand'
import { supabase, db, clearWorkingClientCache, isSupabaseConfigured } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  syncError: string | null
  lastSyncTime: number | null
  hasInitialSession: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setSyncError: (error: string | null) => void
  setLastSyncTime: (time: number | null) => void
  setHasInitialSession: (hasInitial: boolean) => void
  retryUserSync: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  syncError: null,
  lastSyncTime: null,
  hasInitialSession: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  setSyncError: (error) => set({ syncError: error }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setHasInitialSession: (hasInitial) => set({ hasInitialSession: hasInitial }),
  retryUserSync: async () => {
    const { session } = get()
    if (session?.user) {
      console.log('Retrying user sync...')
      const { data, error } = await db.users.syncFromAuth(session.user)

      if (error) {
        console.error('Retry sync failed:', error)
        set({ syncError: error.message })
      } else {
        console.log('Retry sync successful:', data)
        set({ syncError: null, lastSyncTime: Date.now() })
      }
    }
  },
}))

// FIXED: Initialize auth with corruption detection and recovery
// Based on: https://github.com/supabase/auth-js/issues/768
const initializeAuth = async () => {
  console.log('Initializing auth - checking configuration and browser context...')

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured - skipping auth initialization')
    const { setInitialized, setLoading, setSession } = useAuthStore.getState()
    setInitialized(true)
    setLoading(false)
    setSession(null)
    return
  }

  // Check if this is a page refresh with potential corruption
  const isPageRefresh = (performance as any).navigation?.type === 1 ||
                       (performance.getEntriesByType('navigation')[0] as any)?.type === 'reload'

  if (isPageRefresh && supabase) {
    console.log('Page refresh detected - checking for Supabase corruption...')

    // Test if Supabase is corrupted by trying a simple operation with timeout
    try {
      const testPromise = supabase.from('ScribeProject').select('id').limit(1)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Corruption test timeout')), 1000)
      )

      await Promise.race([testPromise, timeoutPromise])
      console.log('Supabase context is healthy')
    } catch (error) {
      console.error('Supabase context corruption detected:', error)

      // Clear all Supabase storage and force reload
      console.log('Clearing corrupted Supabase storage and reloading...')
      localStorage.removeItem('sb-lsdshceaxnslglcjpqmq-auth-token')
      sessionStorage.clear()

      // Force a hard reload to reset the browser context
      window.location.reload()
      return
    }
  }

  // Don't call getSession() directly - let the auth state change listener handle it
  // Set a timeout to mark as initialized if no auth events fire within 2 seconds
  setTimeout(() => {
    const { initialized, setInitialized, setLoading, setSession, setHasInitialSession } = useAuthStore.getState()
    if (!initialized) {
      console.log('Auth initialization timeout - marking as initialized with no session')
      setInitialized(true)
      setLoading(false)
      setSession(null)
      setHasInitialSession(true) // Mark as having processed initial state
    }
  }, 2000)
}

// FIXED: Proper auth state change listener management to prevent race conditions
// Based on: https://github.com/supabase/auth-js/issues/768
let authSubscription: any = null

const setupAuthListener = () => {
  // Clean up existing subscription if any
  if (authSubscription) {
    authSubscription.unsubscribe()
  }

  // Set up single auth state change listener
  // NOTE: setTimeout wrapper is intentional to prevent race conditions with Supabase auth state changes
  authSubscription = supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      console.log('Auth state changed:', { event, userEmail: session?.user?.email })

      const {
        setSession,
        setLoading,
        initialized,
        setInitialized,
        hasInitialSession,
        setHasInitialSession,
        lastSyncTime,
        setLastSyncTime,
        setSyncError
      } = useAuthStore.getState()

      // Update session in store
      setSession(session)

      // Mark as initialized if not already
      if (!initialized) {
        setInitialized(true)
      }

      // Stop loading
      setLoading(false)

      // Handle SIGNED_IN events with smart logic to prevent unnecessary syncs
      if (event === 'SIGNED_IN' && session?.user) {
        const now = Date.now()
        const SYNC_COOLDOWN = 30000 // 30 seconds cooldown between syncs

        // Check if this is the initial session restoration
        if (!hasInitialSession) {
          console.log('Initial session detected, marking as processed (no sync needed)')
          setHasInitialSession(true)
          return
        }

        // Check if we've synced recently (debouncing)
        if (lastSyncTime && (now - lastSyncTime) < SYNC_COOLDOWN) {
          console.log('User sync skipped - too recent (within cooldown period)')
          return
        }

        console.log('User signed in, syncing to database...')
        const { data, error } = await db.users.syncFromAuth(session.user)

        if (error) {
          console.error('Error syncing user to database:', error)
          setSyncError(error.message)
        } else {
          console.log('User synced to database successfully:', data)
          setSyncError(null)
          setLastSyncTime(now)
        }
      }

      if (event === 'SIGNED_OUT') {
        console.log('User signed out')
        // Clear sync state when user signs out
        setSyncError(null)
        setLastSyncTime(null)
        setHasInitialSession(false)
        // Clear cached working client to prevent stale auth
        clearWorkingClientCache()
      }
    }, 0)
  })

  return authSubscription
}

// Set up the auth listener
const subscription = setupAuthListener()

// Initialize auth when store is created
initializeAuth()

// Clean up subscription on module unload (though this rarely happens in React apps)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscription?.unsubscribe()
  })
}

