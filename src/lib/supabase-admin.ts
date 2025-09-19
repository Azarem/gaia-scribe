import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl) {
  throw new Error('Missing VITE_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  console.warn('Missing VITE_SUPABASE_SERVICE_ROLE_KEY - admin operations will not work')
}

// Create admin client with service role key (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}) : null

/**
 * Create a user record using the service role key (bypasses JWT issues)
 * This is a workaround for the corrupted JWT token issue
 */
export async function createUserWithServiceRole(userData: {
  id: string
  email: string
  name?: string
}) {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  console.log('🔧 Creating user with service role key (bypassing JWT issue):', userData.id)

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('User')
      .select('id, email, name')
      .eq('id', userData.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking existing user:', checkError)
      throw checkError
    }

    if (existingUser) {
      console.log('✅ User already exists:', existingUser)
      return { data: existingUser, error: null }
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('User')
      .insert({
        id: userData.id,
        email: userData.email,
        name: userData.name || userData.email.split('@')[0],
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating user with service role:', createError)
      throw createError
    }

    console.log('✅ User created successfully with service role:', newUser)
    return { data: newUser, error: null }

  } catch (error) {
    console.error('❌ Service role user creation failed:', error)
    return { data: null, error }
  }
}

/**
 * Get user projects using service role key (bypasses JWT issues)
 */
export async function getUserProjectsWithServiceRole(userId: string) {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  console.log('🔧 Getting user projects with service role key:', userId)

  try {
    const { data: projects, error } = await supabaseAdmin
      .from('ScribeProject')
      .select('*')
      .eq('createdBy', userId)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('❌ Error getting projects with service role:', error)
      throw error
    }

    console.log('✅ Projects retrieved successfully with service role:', projects?.length || 0)
    return { data: projects, error: null }

  } catch (error) {
    console.error('❌ Service role project retrieval failed:', error)
    return { data: null, error }
  }
}
