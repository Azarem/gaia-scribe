import { supabase, createWorkingClient } from '../../lib/supabase'
import { isAnonymousModeEnabled, ANONYMOUS_USER_ID } from '../../lib/environment'

export const users = {
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

      // Skip user sync in anonymous mode
      if (isAnonymousModeEnabled() && authUser.id === ANONYMOUS_USER_ID) {
        console.log('Skipping user sync in anonymous mode')
        return {
          data: {
            id: ANONYMOUS_USER_ID,
            email: 'anonymous@localhost.dev',
            name: 'Anonymous Developer',
            avatarUrl: null
          },
          error: null
        }
      }

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
}

