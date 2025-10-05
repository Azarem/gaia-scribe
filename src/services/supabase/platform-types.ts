import { PlatformType } from '@prisma/client'
import { supabase } from '../../lib/supabase'

export const platformTypes = {
  async getByPlatform(platformId: string) {
    return supabase.from('PlatformType')
      .select<'*', PlatformType>()
      .eq('platformId', platformId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
  },

  async create(platformType: Omit<PlatformType, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'deletedBy'>, userId: string) {
    return supabase.from('PlatformType')
      .insert({
        ...platformType,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      })
      .select()
      .single<PlatformType>()
  },


  async getById(id: string) {
    return supabase.from('PlatformType')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single<PlatformType>()
  },

  async update(id: string, updates: { name?: string; meta?: any }, userId: string) {
    return supabase.from('PlatformType')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      })
      .eq('id', id)
      .select()
      .single<PlatformType>()
  },

  async delete(id: string, userId: string) {
    return supabase.from('PlatformType')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

