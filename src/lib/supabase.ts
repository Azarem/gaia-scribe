import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

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

// Auth helpers
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGitHub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Database API helpers (using Supabase REST API, not Prisma client)
export const db = {
  // Projects
  projects: {
    async getAll() {
      return supabase
        .from('ScribeProject')
        .select(`
          *,
          createdByUser:User!inner(id, name, email)
        `)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
    },
    
    async getById(id: string) {
      return supabase
        .from('ScribeProject')
        .select('*')
        .eq('id', id)
        .is('deletedAt', null)
        .single()
    },
    
    async create(project: { name: string; isPublic?: boolean; gameRomId?: string }, userId: string) {
      return supabase
        .from('ScribeProject')
        .insert({
          name: project.name,
          isPublic: project.isPublic || false,
          gameRomId: project.gameRomId,
          createdBy: userId,
        })
        .select()
        .single()
    },
    
    async update(id: string, updates: { name?: string; isPublic?: boolean }, userId: string) {
      return supabase
        .from('ScribeProject')
        .update({
          ...updates,
          updatedBy: userId,
        })
        .eq('id', id)
        .select()
        .single()
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
    
    async upsert(user: { id: string; email?: string; name?: string; avatarUrl?: string }) {
      return supabase
        .from('User')
        .upsert(user)
        .select()
        .single()
    },
  }
}
