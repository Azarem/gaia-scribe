import { supabase } from '../../lib/supabase'
import type { ScribeProject } from '@prisma/client'

export const projects = {
  async getAll() {
    return supabase
      .from('ScribeProject')
      .select('*')
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })
  },

  async getByUser(userId: string) {
    return supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
      .eq('createdBy', userId)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false, nullsFirst: false })
      .order('createdAt', { ascending: false })
  },

  async getPublic(searchQuery?: string) {
    let query = supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
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
    return supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(limit)
  },

  async getPublicRecentlyUpdated(limit: number = 12) {
    return supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .not('updatedAt', 'is', null)
      .order('updatedAt', { ascending: false })
      .limit(limit)
  },

  async getPublicMostActive(limit: number = 12) {
    // Projects with recent updates, ordered by most recent activity
    return supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
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
    return supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
      .eq('isPublic', true)
      .is('deletedAt', null)
      .gte('createdAt', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('createdAt', { ascending: false })
      .limit(limit)
  },

  async getByName(name: string) {
    return supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
      .ilike('name', `%${name.trim()}%`)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })
  },

  async getByUserWithNameFilter(userId: string, nameFilter?: string) {
    let query = supabase.from('ScribeProject')
      .select<'*', ScribeProject>()
      .eq('createdBy', userId)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false })

    if (nameFilter?.trim()) {
      query = query.ilike('name', `%${nameFilter.trim()}%`)
    }

    return query
  },
  
  async getById(id: string) {
    return supabase.from('ScribeProject')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single<ScribeProject>()
  },
  
  async create(project: Omit<ScribeProject, 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>, userId: string) {
    return supabase.from('ScribeProject')
      .insert({
        ...project,
        createdBy: userId,
      })
      .select()
      .single<ScribeProject>()
  },
  
  async update(id: string, updates: { name?: string; isPublic?: boolean }, userId: string) {
    return supabase.from('ScribeProject')
      .update({
        ...updates,
        updatedBy: userId,
      })
      .eq('id', id)
      .select()
      .single<ScribeProject>()
  },

  async delete(id: string, userId: string) {
    return supabase.from('ScribeProject')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
      .eq('createdBy', userId) // Only allow deletion by owner
  },
}

