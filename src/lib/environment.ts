/**
 * Environment detection and configuration utilities
 * Handles anonymous mode for local development
 */

import type { User } from '@supabase/supabase-js'

/**
 * Check if we're running in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development'
}

/**
 * Check if we're running in production mode
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD || import.meta.env.MODE === 'production'
}

/**
 * Check if anonymous mode is enabled
 * Only works in development mode for security
 */
export const isAnonymousModeEnabled = (): boolean => {
  // Only allow anonymous mode in development
  if (!isDevelopment()) {
    return false
  }

  const anonymousMode = import.meta.env.VITE_ENABLE_ANONYMOUS_MODE
  return anonymousMode === 'true' || anonymousMode === '1'
}

/**
 * Anonymous user ID for consistent identification
 */
export const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Create a mock anonymous user for development
 */
export const createAnonymousUser = (): User => {
  return {
    id: ANONYMOUS_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'anonymous@localhost.dev',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'anonymous',
      providers: ['anonymous']
    },
    user_metadata: {
      name: 'Anonymous Developer',
      avatar_url: null,
      full_name: 'Anonymous Developer'
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false
  }
}

/**
 * Log anonymous mode status with appropriate warnings
 */
export const logAnonymousModeStatus = (): void => {
  if (isAnonymousModeEnabled()) {
    console.warn('🚨 ANONYMOUS MODE ENABLED 🚨')
    console.warn('Authentication is bypassed for local development')
    console.warn('This should NEVER be enabled in production!')
    console.warn('User:', createAnonymousUser().email)
  } else if (isDevelopment()) {
    console.log('🔒 Authentication required (anonymous mode disabled)')
  }
}

/**
 * Create anonymous session for development
 */
export const createAnonymousSession = () => {
  const user = createAnonymousUser()
  return {
    access_token: 'anonymous-token',
    refresh_token: 'anonymous-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user
  }
}

/**
 * Check if a user is the anonymous user
 */
export const isAnonymousUser = (user: User | null): boolean => {
  return user?.id === ANONYMOUS_USER_ID
}

/**
 * Get user display name for anonymous or real users
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'Unknown User'
  if (isAnonymousUser(user)) return 'Anonymous Developer'
  return user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'User'
}

/**
 * Validate environment configuration
 */
export const validateEnvironment = (): void => {
  // CRITICAL: Ensure anonymous mode is never enabled in production
  if (isProduction() && import.meta.env.VITE_ENABLE_ANONYMOUS_MODE === 'true') {
    // This is a critical security error - throw immediately
    const errorMessage =
      '🚨 CRITICAL SECURITY ERROR 🚨\n' +
      'Anonymous mode is enabled in production!\n' +
      'This bypasses all authentication and is a serious security vulnerability.\n' +
      'Set VITE_ENABLE_ANONYMOUS_MODE=false or remove it entirely.\n' +
      'Application startup blocked for security.'

    console.error(errorMessage)
    alert(errorMessage) // Ensure visibility in production
    throw new Error(errorMessage)
  }

  // Additional production safety checks
  if (isProduction()) {
    // Ensure we have proper Supabase configuration in production
    if (!import.meta.env.VITE_PUBLIC_SUPABASE_URL || !import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing required Supabase configuration in production')
    }

    // Log production startup (without sensitive info)
    console.log('🔒 Production mode: Authentication required')
    console.log('Environment validated successfully')
  }

  // Development mode checks
  if (isDevelopment()) {
    console.log('🛠️ Development mode detected')
    console.log('Environment:', import.meta.env.MODE)

    // Warn about missing environment variables in development
    if (!import.meta.env.VITE_PUBLIC_SUPABASE_URL) {
      console.warn('⚠️ Missing VITE_PUBLIC_SUPABASE_URL')
    }
    if (!import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('⚠️ Missing VITE_PUBLIC_SUPABASE_ANON_KEY')
    }
  }

  logAnonymousModeStatus()
}
