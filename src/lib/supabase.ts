import { createClient } from '@supabase/supabase-js'
import { isAnonymousModeEnabled } from './environment'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// FIXED: Single Supabase client configuration with OAuth support
// Enable detectSessionInUrl for automatic OAuth token processing
// This is the standard pattern from Supabase documentation
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable for OAuth flows (GitHub, etc.)
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Simplified working client - returns appropriate client based on mode
// No caching to prevent "Multiple GoTrueClient instances" warnings
export const createWorkingClient = () => {
  // In anonymous mode, use separate client without authentication
  if (isAnonymousModeEnabled()) {
    console.log('Creating working client for anonymous mode...')
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  // For authenticated users, use the main client
  // This ensures consistent auth state and prevents client conflicts
  return supabase
}

// Clear cached working client (no-op for backward compatibility)
export const clearWorkingClientCache = () => {
  // No-op since we're using single client approach
  console.log('clearWorkingClientCache called (no-op in single client mode)')
}

// Auth helpers with improved error handling and automatic account creation
export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log('Attempting email sign-in for:', email)

    // First, try to sign in with existing credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If sign-in successful, return the result
    if (signInData?.user && !signInError) {
      console.log('Email sign-in successful for existing user')
      return { data: signInData, error: null }
    }

    // Check if the error indicates invalid credentials (user doesn't exist)
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      console.log('User not found, attempting to create new account for:', email)

      // Try to create a new account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Set email redirect for confirmation
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (signUpError) {
        console.error('Account creation failed:', signUpError.message)

        // If account creation fails due to user already existing, try sign-in again
        // This can happen in race conditions or if the user was created between attempts
        if (signUpError.message.includes('User already registered')) {
          console.log('User was created between attempts, retrying sign-in...')
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (retryError) {
            console.error('Retry sign-in failed:', retryError.message)
            return { data: null, error: retryError }
          }

          console.log('Retry sign-in successful')
          return { data: retryData, error: null }
        }

        // Return the sign-up error if it's not a "user already exists" error
        return { data: null, error: signUpError }
      }

      // Account creation successful
      if (signUpData?.user) {
        // Check if the user is immediately confirmed (no email confirmation required)
        if (signUpData.session) {
          console.log('New account created and signed in successfully')
          return { data: signUpData, error: null }
        } else {
          // User created but needs email confirmation
          console.log('Account created successfully. Please check your email to confirm your account.')
          return {
            data: null,
            error: new Error('Account created successfully. Please check your email to confirm your account before signing in.')
          }
        }
      }

      // This shouldn't happen, but handle the case where signUp succeeds but no user is returned
      console.warn('Account creation succeeded but no user data returned')
      return { data: signUpData, error: null }
    }

    // For any other sign-in errors, return them as-is
    console.error('Email sign-in error:', signInError?.message)
    return { data: null, error: signInError }

  } catch (error) {
    console.error('Email authentication exception:', error)
    return { data: null, error: error as Error }
  }
}

// Explicit sign-up function for new user registration
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    console.log('Attempting to create new account for:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
      console.error('Account creation error:', error.message)
      return { data: null, error }
    }

    console.log('Account creation successful')
    return { data, error: null }
  } catch (error) {
    console.error('Account creation exception:', error)
    return { data: null, error: error as Error }
  }
}

export const signInWithGitHub = async () => {
  try {
    console.log('Attempting GitHub sign-in')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Request additional permissions for better user info
        scopes: 'read:user user:email'
      },
    })

    if (error) {
      console.error('GitHub sign-in error:', error.message)
      return { data: null, error }
    }

    console.log('GitHub sign-in initiated')
    return { data, error: null }
  } catch (error) {
    console.error('GitHub sign-in exception:', error)
    return { data: null, error: error as Error }
  }
}

export const signOut = async () => {
  try {
    console.log('Attempting sign-out')
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign-out error:', error.message)
      return { error }
    }
    
    console.log('Sign-out successful')
    return { error: null }
  } catch (error) {
    console.error('Sign-out exception:', error)
    return { error: error as Error }
  }
}

// Database API helpers have been moved to src/services/supabase/
// Import { db } from '../services/supabase' to use the database services


