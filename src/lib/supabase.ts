import { createClient } from '@supabase/supabase-js'
import { createId } from '@paralleldrive/cuid2'
import type {
  ProjectBranchData,
  GameRomBranchData
} from '@gaialabs/shared'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// FIXED: Standard Supabase client configuration
// The hanging issue was caused by race conditions in auth state change listeners, not client config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Create a fresh Supabase client instance for database operations
// This works around the hanging bug by creating clean client instances
export const createFreshSupabaseClient = () => {
  console.log('Creating fresh Supabase client...')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // Don't auto-refresh on fresh clients
      persistSession: false,   // Don't persist session for fresh client
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
}

// FIXED: Create a cached working client with direct token authentication
// Avoid setSession() which can also hang - use direct token approach
// Cache the client to prevent "Multiple GoTrueClient instances" warning
let cachedWorkingClient: any = null
let cachedAccessToken: string | null = null

export const createWorkingClient = () => {
  // Get session token from localStorage directly
  let accessToken = null
  try {
    const authKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
    const authData = localStorage.getItem(authKey)

    if (authData) {
      const session = JSON.parse(authData)
      accessToken = session.access_token
    }
  } catch (error) {
    console.warn('Could not get token from localStorage:', error)
  }

  // Return cached client if token hasn't changed
  if (cachedWorkingClient && cachedAccessToken === accessToken) {
    return cachedWorkingClient
  }

  console.log('Creating working client with direct token auth...')

  // Create new client with token in headers if available
  if (accessToken) {
    cachedWorkingClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
    cachedAccessToken = accessToken
    console.log('Found access token in localStorage')
  } else {
    // Fallback to fresh client without auth
    cachedWorkingClient = createFreshSupabaseClient()
    cachedAccessToken = null
    console.log('No session found in localStorage')
  }

  return cachedWorkingClient
}

// Clear cached working client (useful when user signs out)
export const clearWorkingClientCache = () => {
  console.log('Clearing cached working client')
  cachedWorkingClient = null
  cachedAccessToken = null
}

// External API configuration (using HTTP requests instead of Supabase client)
const EXTERNAL_SUPABASE_URL = 'https://adwobxutnpmjbmhdxrzx.supabase.co'
const EXTERNAL_SUPABASE_KEY = 'sb_publishable_uBZdKmgGql5sDNGpj1DVMQ_opZ2V4kV'

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

// Database API helpers (using Supabase REST API, not Prisma client)
export const db = {
  // Projects
  projects: {
    async getAll() {
      return supabase
        .from('ScribeProject')
        .select('*')
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
    },

    async getByUser(userId: string) {
      console.log('Getting projects for user with working client:', userId)
      const workingClient = createWorkingClient()
      return workingClient
        .from('ScribeProject')
        .select('*')
        .eq('createdBy', userId)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false, nullsFirst: false })
        .order('createdAt', { ascending: false })
    },

    async getPublic(searchQuery?: string) {
      let query = supabase
        .from('ScribeProject')
        .select('*')
        .eq('isPublic', true)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })

      if (searchQuery?.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`)
      }

      return query.limit(20)
    },

    // Public project discovery methods
    async getPublicRecent(limit: number = 12) {
      return supabase
        .from('ScribeProject')
        .select('*')
        .eq('isPublic', true)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(limit)
    },

    async getPublicRecentlyUpdated(limit: number = 12) {
      return supabase
        .from('ScribeProject')
        .select('*')
        .eq('isPublic', true)
        .is('deletedAt', null)
        .not('updatedAt', 'is', null)
        .order('updatedAt', { ascending: false })
        .limit(limit)
    },

    async getPublicMostActive(limit: number = 12) {
      // Projects with recent updates, ordered by most recent activity
      return supabase
        .from('ScribeProject')
        .select('*')
        .eq('isPublic', true)
        .is('deletedAt', null)
        .not('updatedAt', 'is', null)
        .gte('updatedAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('updatedAt', { ascending: false })
        .limit(limit)
    },

    async getPublicPopular(limit: number = 12) {
      // For now, use a combination of recent creation and updates as a proxy for popularity
      // This could be enhanced later with engagement metrics
      return supabase
        .from('ScribeProject')
        .select('*')
        .eq('isPublic', true)
        .is('deletedAt', null)
        .gte('createdAt', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .order('createdAt', { ascending: false })
        .limit(limit)
    },

    async getByName(name: string) {
      return supabase
        .from('ScribeProject')
        .select('*')
        .ilike('name', `%${name.trim()}%`)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
    },

    async getByUserWithNameFilter(userId: string, nameFilter?: string) {
      let query = supabase
        .from('ScribeProject')
        .select('*')
        .eq('createdBy', userId)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })

      if (nameFilter?.trim()) {
        query = query.ilike('name', `%${nameFilter.trim()}%`)
      }

      return query
    },
    
    async getById(id: string) {
      return supabase
        .from('ScribeProject')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },
    
    async create(project: { name: string; isPublic?: boolean; gameRomId?: string; meta?: any }, userId: string) {
      const projectId = createId()
      return (supabase as any)
        .from('ScribeProject')
        .insert({
          id: projectId,
          name: project.name,
          isPublic: project.isPublic || false,
          gameRomId: project.gameRomId,
          meta: project.meta,
          createdBy: userId,
        })
        .select()
        .single()
    },
    
    async update(id: string, updates: { name?: string; isPublic?: boolean }, userId: string) {
      return (supabase as any)
        .from('ScribeProject')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('ScribeProject')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
        .eq('createdBy', userId) // Only allow deletion by owner
    },
  },

  // Project Users (Contributors)
  projectUsers: {
    async getByProject(projectId: string) {
      return supabase
        .from('ProjectUser')
        .select(`
          *,
          user:User!ProjectUser_userId_fkey (
            id,
            name,
            email,
            avatarUrl
          )
        `)
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('createdAt', { ascending: true })
    },

    async create(projectUser: { projectId: string; userId: string; role?: string }, createdBy: string) {
      const projectUserId = createId()
      return (supabase as any)
        .from('ProjectUser')
        .insert({
          id: projectUserId,
          projectId: projectUser.projectId,
          userId: projectUser.userId,
          role: projectUser.role || 'contributor',
          createdBy,
        })
        .select(`
          *,
          user:User!ProjectUser_userId_fkey (
            id,
            name,
            email,
            avatarUrl
          )
        `)
        .single()
    },

    async update(id: string, updates: { role?: string }, userId: string) {
      return (supabase as any)
        .from('ProjectUser')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select(`
          *,
          user:User!ProjectUser_userId_fkey (
            id,
            name,
            email,
            avatarUrl
          )
        `)
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('ProjectUser')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },

    async removeByUserAndProject(projectId: string, userId: string, deletedBy: string) {
      return (supabase as any)
        .from('ProjectUser')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy,
        })
        .eq('projectId', projectId)
        .eq('userId', userId)
        .is('deletedAt', null)
    },
  },

  // Cops
  cops: {
    async getByProject(projectId: string) {
      return supabase
        .from('Cop')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('code', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('Cop')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(cop: { code: number; mnemonic: string; parts?: string[]; halt?: boolean; projectId: string }, userId: string) {
      const copId = createId()
      return (supabase as any)
        .from('Cop')
        .insert({
          id: copId,
          code: cop.code,
          mnemonic: cop.mnemonic,
          parts: cop.parts || [],
          halt: cop.halt || false,
          projectId: cop.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { code?: number; mnemonic?: string; parts?: string[]; halt?: boolean }, userId: string) {
      return (supabase as any)
        .from('Cop')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('Cop')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Files
  files: {
    async getByProject(projectId: string) {
      return supabase
        .from('File')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('name', { ascending: true })
        .limit(3000)
    },

    async getById(id: string) {
      return supabase
        .from('File')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(file: { name: string; location: number; size: number; type: string; group?: string; scene?: string; compressed?: boolean; upper?: boolean; meta?: any; projectId: string }, userId: string) {
      const fileId = createId()
      return (supabase as any)
        .from('File')
        .insert({
          id: fileId,
          name: file.name,
          location: file.location,
          size: file.size,
          type: file.type,
          group: file.group,
          scene: file.scene,
          compressed: file.compressed,
          upper: file.upper,
          meta: file.meta,
          projectId: file.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { name?: string; location?: number; size?: number; type?: string; group?: string; scene?: string; compressed?: boolean; upper?: boolean; meta?: any }, userId: string) {
      return (supabase as any)
        .from('File')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('File')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Blocks
  blocks: {
    async getByProject(projectId: string) {
      return supabase
        .from('Block')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('name', { ascending: true })
        .limit(3000)
    },

    async getById(id: string) {
      return supabase
        .from('Block')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(block: { name: string; movable?: boolean; group?: string; scene?: string; postProcess?: string; meta?: any; projectId: string }, userId: string) {
      const blockId = createId()
      return (supabase as any)
        .from('Block')
        .insert({
          id: blockId,
          name: block.name,
          movable: block.movable || false,
          group: block.group,
          scene: block.scene,
          postProcess: block.postProcess,
          meta: block.meta,
          projectId: block.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { name?: string; movable?: boolean; group?: string; scene?: string; postProcess?: string; meta?: any }, userId: string) {
      return (supabase as any)
        .from('Block')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('Block')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // BlockTransforms
  blockTransforms: {
    async getByBlock(blockId: string) {
      return supabase
        .from('BlockTransform')
        .select('*')
        .eq('blockId', blockId)
        .is('deletedAt', null)
        .order('regex', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('BlockTransform')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(transform: { regex: string; replacement: string; blockId: string }, userId: string) {
      const transformId = createId()
      return (supabase as any)
        .from('BlockTransform')
        .insert({
          id: transformId,
          regex: transform.regex,
          replacement: transform.replacement,
          blockId: transform.blockId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { regex?: string; replacement?: string }, userId: string) {
      return (supabase as any)
        .from('BlockTransform')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('BlockTransform')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // BlockParts
  blockParts: {
    async getByProject(projectId: string) {
      return supabase
        .from('BlockPart')
        .select('*,block:Block!inner(id,projectId,deletedAt)')
        .eq('block.projectId', projectId)
        .is('deletedAt', null)
        .is('block.deletedAt', null)
        .limit(8000)
    },

    async getByBlock(blockId: string) {
      return supabase
        .from('BlockPart')
        .select('*')
        .eq('blockId', blockId)
        .is('deletedAt', null)
        .order('index', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('BlockPart')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(part: { name: string; location: number; size: number; type: string; index?: number; blockId: string }, userId: string) {
      const partId = createId()
      return (supabase as any)
        .from('BlockPart')
        .insert({
          id: partId,
          name: part.name,
          location: part.location,
          size: part.size,
          type: part.type,
          index: part.index,
          blockId: part.blockId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { name?: string; location?: number; size?: number; type?: string; index?: number }, userId: string) {
      return (supabase as any)
        .from('BlockPart')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('BlockPart')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // StringTypes
  strings: {
    async getByProject(projectId: string) {
      return supabase
        .from('StringType')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('name', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('StringType')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(stringType: { name: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[]; projectId: string }, userId: string) {
      const stringTypeId = createId()
      return (supabase as any)
        .from('StringType')
        .insert({
          id: stringTypeId,
          name: stringType.name,
          delimiter: stringType.delimiter,
          shiftType: stringType.shiftType,
          terminator: stringType.terminator,
          greedy: stringType.greedy,
          meta: stringType.meta,
          characterMap: stringType.characterMap || [],
          projectId: stringType.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { name?: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[] }, userId: string) {
      return (supabase as any)
        .from('StringType')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('StringType')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Alias for consistency with other naming patterns
  stringTypes: {
    async getByProject(projectId: string) {
      return db.strings.getByProject(projectId)
    },

    async getById(id: string) {
      return db.strings.getById(id)
    },

    async create(stringType: { name: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[]; projectId: string }, userId: string) {
      return db.strings.create(stringType, userId)
    },

    async update(id: string, updates: { name?: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[] }, userId: string) {
      return db.strings.update(id, updates, userId)
    },

    async delete(id: string, userId: string) {
      return db.strings.delete(id, userId)
    },
  },

  // BlockArtifacts
  blockArtifacts: {
    async getByBlock(blockId: string) {
      return supabase
        .from('BlockArtifact')
        .select('*')
        .eq('blockId', blockId)
        .is('deletedAt', null)
        .single()
    },

    async getById(id: string) {
      return supabase
        .from('BlockArtifact')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(artifact: { blockId: string; content: string; meta?: any }, userId: string) {
      const artifactId = createId()
      return (supabase as any)
        .from('BlockArtifact')
        .insert({
          id: artifactId,
          blockId: artifact.blockId,
          content: artifact.content,
          meta: artifact.meta,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { content?: string; meta?: any }, userId: string) {
      return (supabase as any)
        .from('BlockArtifact')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async upsert(artifact: { blockId: string; content: string; meta?: any; createdBy: string; updatedBy: string }) {
      return (supabase as any)
        .from('BlockArtifact')
        .upsert({
          blockId: artifact.blockId,
          content: artifact.content,
          meta: artifact.meta,
          createdBy: artifact.createdBy,
          updatedBy: artifact.updatedBy,
        })
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('BlockArtifact')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // StringCommands
  stringCommands: {
    async getByStringType(stringTypeId: string) {
      return supabase
        .from('StringCommand')
        .select('*')
        .eq('stringTypeId', stringTypeId)
        .is('deletedAt', null)
        .order('code', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('StringCommand')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(command: { code: number; mnemonic: string; types?: string[]; delimiter?: number; halt?: boolean; parts?: string[]; meta?: any; stringTypeId: string }, userId: string) {
      const commandId = createId()
      return (supabase as any)
        .from('StringCommand')
        .insert({
          id: commandId,
          code: command.code,
          mnemonic: command.mnemonic,
          types: command.types || [],
          delimiter: command.delimiter,
          halt: command.halt,
          parts: command.parts || [],
          meta: command.meta,
          stringTypeId: command.stringTypeId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { code?: number; mnemonic?: string; types?: string[]; delimiter?: number; halt?: boolean; parts?: string[]; meta?: any }, userId: string) {
      return (supabase as any)
        .from('StringCommand')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('StringCommand')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Structs
  structs: {
    async getByProject(projectId: string) {
      return supabase
        .from('Struct')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('name', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('Struct')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(struct: { name: string; types?: string[]; delimiter?: number; discriminator?: number; parent?: string; parts?: string[]; meta?: any; projectId: string }, userId: string) {
      const structId = createId()
      return (supabase as any)
        .from('Struct')
        .insert({
          id: structId,
          name: struct.name,
          types: struct.types || [],
          delimiter: struct.delimiter,
          discriminator: struct.discriminator,
          parent: struct.parent,
          parts: struct.parts || [],
          meta: struct.meta,
          projectId: struct.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { name?: string; types?: string[]; delimiter?: number; discriminator?: number; parent?: string; parts?: string[]; meta?: any }, userId: string) {
      return (supabase as any)
        .from('Struct')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('Struct')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Labels
  labels: {
    async getByProject(projectId: string) {
      return supabase
        .from('Label')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('location', { ascending: true })
        .limit(3000)
    },

    async getById(id: string) {
      return supabase
        .from('Label')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(label: { location: number; label: string; projectId: string }, userId: string) {
      const labelId = createId()
      return (supabase as any)
        .from('Label')
        .insert({
          id: labelId,
          location: label.location,
          label: label.label,
          projectId: label.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { location?: number; label?: string }, userId: string) {
      return (supabase as any)
        .from('Label')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('Label')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Rewrites
  rewrites: {
    async getByProject(projectId: string) {
      return supabase
        .from('Rewrite')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('location', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('Rewrite')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(rewrite: { location: number; value: number; projectId: string }, userId: string) {
      const rewriteId = createId()
      return (supabase as any)
        .from('Rewrite')
        .insert({
          id: rewriteId,
          location: rewrite.location,
          value: rewrite.value,
          projectId: rewrite.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { location?: number; value?: number }, userId: string) {
      return (supabase as any)
        .from('Rewrite')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('Rewrite')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // GameMnemonics
  mnemonics: {
    async getByProject(projectId: string) {
      return supabase
        .from('GameMnemonic')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('address', { ascending: true })
        .limit(2000)
    },

    async getById(id: string) {
      return supabase
        .from('GameMnemonic')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(mnemonic: { address: number; mnemonic: string; meta?: any; projectId: string }, userId: string) {
      const mnemonicId = createId()
      return (supabase as any)
        .from('GameMnemonic')
        .insert({
          id: mnemonicId,
          address: mnemonic.address,
          mnemonic: mnemonic.mnemonic,
          meta: mnemonic.meta,
          projectId: mnemonic.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { address?: number; mnemonic?: string; meta?: any }, userId: string) {
      return (supabase as any)
        .from('GameMnemonic')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('GameMnemonic')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Overrides
  overrides: {
    async getByProject(projectId: string) {
      return supabase
        .from('Override')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('location', { ascending: true })
    },

    async getById(id: string) {
      return supabase
        .from('Override')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async create(override: { location: number; register?: string; value: number; projectId: string }, userId: string) {
      const overrideId = createId()
      return (supabase as any)
        .from('Override')
        .insert({
          id: overrideId,
          location: override.location,
          register: override.register || 'A',
          value: override.value,
          projectId: override.projectId,
          createdBy: userId,
        })
        .select()
        .single()
    },

    async update(id: string, updates: { location?: number; register?: string; value?: number }, userId: string) {
      return (supabase as any)
        .from('Override')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
    },

    async delete(id: string, userId: string) {
      return (supabase as any)
        .from('Override')
        .update({
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        })
        .eq('id', id)
    },
  },

  // Users
  users: {
    async getById(id: string) {
      return supabase
        .from('User')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },

    async search(query: string, limit: number = 10) {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) {
        return { data: [], error: null }
      }

      return supabase
        .from('User')
        .select('id, name, email, avatarUrl')
        .or(`name.ilike.%${trimmedQuery}%,email.ilike.%${trimmedQuery}%`)
        .is('deletedAt', null)
        .order('name', { ascending: true })
        .limit(limit)
    },

    // Keep the old method for backward compatibility
    async searchByEmail(email: string, limit: number = 10) {
      return this.search(email, limit)
    },
    
    async upsert(user: { id: string; email?: string; name?: string; avatarUrl?: string }) {
      return (supabase as any)
        .from('User')
        .upsert(user)
        .select()
        .single()
    },

    async syncFromAuth(authUser: any) {
      try {
        console.log('Starting user sync for:', authUser.id)

        // Create a working client with proper authentication headers
        const workingClient = createWorkingClient()
        console.log('Using working client with direct token authentication')

        // First check if user already exists
        const { data: existingUser, error: fetchError } = await workingClient
          .from('User')
          .select('id, email, name, avatarUrl')
          .eq('id', authUser.id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new users
          console.error('Error checking existing user:', fetchError)
          return { data: null, error: fetchError }
        }

        // Prepare user data with proper audit fields
        const userData = {
          id: authUser.id,
          email: authUser.email || null,
          name: authUser.user_metadata?.full_name ||
                authUser.user_metadata?.name ||
                authUser.user_metadata?.user_name ||
                authUser.user_metadata?.preferred_username ||
                null,
          avatarUrl: authUser.user_metadata?.avatar_url || null,
          // Set audit fields - user creates their own record
          createdBy: authUser.id
        }

        console.log('User data prepared:', { ...userData, createdBy: '[REDACTED]', updatedBy: '[REDACTED]' })

        if (existingUser) {
          // Update existing user only if data has changed
          const hasChanges =
            existingUser.email !== userData.email ||
            existingUser.name !== userData.name ||
            existingUser.avatarUrl !== userData.avatarUrl

          if (!hasChanges) {
            console.log('No changes detected, skipping update')
            return { data: existingUser, error: null }
          }

          console.log('Updating existing user')
          return await workingClient
            .from('User')
            .update({
              email: userData.email,
              name: userData.name,
              avatarUrl: userData.avatarUrl,
              updatedBy: authUser.id,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', authUser.id)
            .select()
            .single()
        } else {
          // Insert new user
          console.log('Creating new user')
          return await workingClient
            .from('User')
            .insert(userData)
            .select()
            .single()
        }
      } catch (error) {
        console.error('Exception in syncFromAuth:', error)
        return { data: null, error: error as Error }
      }
    },
  },

  // External project search (for importing from public API via HTTP)
  // Uses @gaialabs/shared functions for standardized data access
  external: {
    async searchGameRomBranches(searchQuery?: string) {
      try {
        // Search GameRomBranches with game name filtering
        let url = `${EXTERNAL_SUPABASE_URL}/rest/v1/GameRomBranch?select=*,gameRom:GameRom!inner(id,crc,meta,gameId,regionId,game:Game!inner(id,name),region:Region!inner(id,name,meta,platformId)),platformBranch:PlatformBranch!inner(id,name,version,platformId,addressingModes,instructionSet,vectors,platform:Platform!inner(id,name,meta))&order=updatedAt.desc&limit=20`

        if (searchQuery?.trim()) {
          // Filter by game name using the joined game table
          url += `&gameRom.game.name=ilike.%25${encodeURIComponent(searchQuery.trim())}%25`
        }

        const response = await fetch(url, {
          headers: {
            'apikey': EXTERNAL_SUPABASE_KEY,
            'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json() as GameRomBranchData[]

        return { data, error: null }
      } catch (error) {
        console.error('Error searching external GameRomBranches:', error)
        return { data: null, error }
      }
    },

    async searchProjectBranches(searchQuery?: string) {
      try {
        // Use the existing search functionality from the current implementation
        // This maintains compatibility while we transition to @gaialabs/shared functions
        let url = `${EXTERNAL_SUPABASE_URL}/rest/v1/ProjectBranch?select=*,project:Project!inner(id,name,meta,gameId,baseRomId,createdAt,updatedAt)&order=updatedAt.desc&limit=20`

        if (searchQuery?.trim()) {
          // Filter by project name using the joined project table
          url += `&project.name=ilike.%25${encodeURIComponent(searchQuery.trim())}%25`
        }

        const response = await fetch(url, {
          headers: {
            'apikey': EXTERNAL_SUPABASE_KEY,
            'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json() as ProjectBranchData[]

        return { data, error: null }
      } catch (error) {
        console.error('Error searching external projects:', error)
        return { data: null, error }
      }
    },

    async getProjectBranchById(id: string) {
      try {
        // Include project data with name field using proper JOIN
        const url = `${EXTERNAL_SUPABASE_URL}/rest/v1/ProjectBranch?select=*,project:Project!inner(id,name,meta,gameId,baseRomId,createdAt,updatedAt)&id=eq.${encodeURIComponent(id)}&limit=1`

        const response = await fetch(url, {
          headers: {
            'apikey': EXTERNAL_SUPABASE_KEY,
            'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const branch = data[0]

        return { data: branch || null, error: null }
      } catch (error) {
        console.error('Error fetching external project:', error)
        return { data: null, error }
      }
    },

    // Comprehensive data fetching for complete project import
    async getGameRomBranchById(gameRomBranchId: string) {
      try {
        console.log('Fetching GameRomBranch data for:', gameRomBranchId)

        // Fetch GameRomBranch with all nested relationships needed for import
        const url = `${EXTERNAL_SUPABASE_URL}/rest/v1/GameRomBranch?select=*,gameRom:GameRom!inner(id,crc,meta,gameId,regionId,game:Game!inner(id,name),region:Region!inner(id,name,meta,platformId)),platformBranch:PlatformBranch!inner(id,name,version,platformId,addressingModes,instructionSet,vectors,platform:Platform!inner(id,name,meta))&id=eq.${encodeURIComponent(gameRomBranchId)}&limit=1`

        const response = await fetch(url, {
          headers: {
            'apikey': EXTERNAL_SUPABASE_KEY,
            'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return { data: data[0] || null, error: null }
      } catch (error) {
        console.error('Error fetching GameRomBranch:', error)
        return { data: null, error }
      }
    },

    async getBaseRomBranchById(baseRomBranchId: string) {
      try {
        console.log('Fetching BaseRomBranch data for:', baseRomBranchId)

        // Fetch BaseRomBranch with all nested relationships needed for import
        const url = `${EXTERNAL_SUPABASE_URL}/rest/v1/BaseRomBranch?select=*,baseRom:BaseRom!inner(id,name,gameId,gameRomId),gameRomBranch:GameRomBranch!inner(id,name,version,gameRomId,platformBranchId,coplib,config,files,blocks,fixups,types,gameRom:GameRom!inner(id,crc,meta,gameId,regionId,game:Game!inner(id,name),region:Region!inner(id,name,meta,platformId)),platformBranch:PlatformBranch!inner(id,name,version,platformId,addressingModes,instructionSet,vectors,platform:Platform!inner(id,name,meta)))&id=eq.${encodeURIComponent(baseRomBranchId)}&limit=1`

        const response = await fetch(url, {
          headers: {
            'apikey': EXTERNAL_SUPABASE_KEY,
            'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return { data: data[0] || null, error: null }
      } catch (error) {
        console.error('Error fetching BaseRomBranch:', error)
        return { data: null, error }
      }
    },

    async getCompleteProjectData(projectBranchId: string) {
      try {
        console.log('Fetching complete project data for:', projectBranchId)

        // First get the project branch with all nested relationships
        const { data: projectBranch, error: projectError } = await this.getProjectBranchById(projectBranchId)
        if (projectError || !projectBranch) {
          const errorMsg = projectError instanceof Error ? projectError.message : 'Not found'
          throw new Error(`Failed to fetch project branch: ${errorMsg}`)
        }

        // Get the complete BaseRomBranch data with all nested relationships
        const { data: baseRomBranch, error: baseRomError } = await this.getBaseRomBranchById(projectBranch.baseRomBranchId)
        if (baseRomError || !baseRomBranch) {
          const errorMsg = baseRomError instanceof Error ? baseRomError.message : 'Not found'
          throw new Error(`Failed to fetch base ROM branch: ${errorMsg}`)
        }

        return {
          data: {
            projectBranch,
            baseRomBranch,
            gameRomBranch: baseRomBranch.gameRomBranch,
            platformBranch: baseRomBranch.gameRomBranch.platformBranch,
            platform: baseRomBranch.gameRomBranch.platformBranch.platform,
            gameRom: baseRomBranch.gameRomBranch.gameRom,
            game: baseRomBranch.gameRomBranch.gameRom.game,
            region: baseRomBranch.gameRomBranch.gameRom.region,
            baseRom: baseRomBranch.baseRom
          },
          error: null
        }
      } catch (error) {
        console.error('Error fetching complete project data:', error)
        return { data: null, error }
      }
    }
  }
}
