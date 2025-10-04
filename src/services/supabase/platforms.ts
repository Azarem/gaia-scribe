import { supabase, createWorkingClient } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'
import { Platform } from '@prisma/client'

export const platforms = {
  async getAll() {
    return supabase
      .from('Platform')
      .select<'*', Platform>()
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })
  },

  async getByUser(userId: string) {
    console.log('Getting platforms for user with working client:', userId)
    const workingClient = createWorkingClient()
    return workingClient
      .from('Platform')
      .select<'*', Platform>()
      .eq('createdBy', userId)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false, nullsFirst: false })
      .order('createdAt', { ascending: false })
  },

  async getPublic(searchQuery?: string) {
    let query = supabase
      .from('Platform')
      .select<'*', Platform>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })

    if (searchQuery?.trim()) {
      query = query.ilike('name', `%${searchQuery.trim()}%`)
    }

    return query.limit(20)
  },

  // Public platform discovery methods
  async getPublicRecent(limit: number = 12) {
    return supabase
      .from('Platform')
      .select<'*', Platform>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(limit)
  },

  async getPublicRecentlyUpdated(limit: number = 12) {
    return supabase
      .from('Platform')
      .select<'*', Platform>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })
      .limit(limit)
  },

  async getPublicMostActive(limit: number = 12) {
    // Platforms with recent updates, ordered by most recent activity
    return supabase
      .from('Platform')
      .select<'*', Platform>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })
      .limit(limit)
  },

  async getPublicPopular(limit: number = 12) {
    // For now, use a combination of recent creation and updates as a proxy for popularity
    // This could be enhanced later with engagement metrics
    return supabase
      .from('Platform')
      .select<'*', Platform>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(limit)
  },

  async getByName(name: string) {
    return supabase
      .from('Platform')
      .select<'*', Platform>()
      .ilike('name', `%${name.trim()}%`)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })
  },

  async getByUserWithNameFilter(userId: string, nameFilter?: string) {
    let query = supabase
      .from('Platform')
      .select<'*', Platform>()
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
      .from('Platform')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single<Platform>()
  },

  async create(platform: Omit<Platform, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>, userId: string) {
    return supabase.from('Platform')
      .insert({
        id: createId(),
        ...platform,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      })
      .select()
      .single<Platform>()
  },

  async update(id: string, updates: Partial<Omit<Platform, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>>, userId: string) {
    return supabase.from('Platform')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      })
      .eq('id', id)
      .select()
      .single<Platform>()
  },

  async delete(id: string, userId: string) {
    return (supabase as any)
      .from('Platform')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
      .eq('createdBy', userId) // Only allow deletion by owner
  },
}

