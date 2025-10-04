import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'
import type { Cop } from '@prisma/client'

export const cops = {
  async getByProject(projectId: string) {
    return supabase.from('Cop')
      .select<'*', Cop>()
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('code', { ascending: true })
  },

  async getById(id: string) {
    return supabase.from('Cop')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single<Cop>()
  },

  async create(cop: Omit<Cop, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>, userId: string) {
    return supabase.from('Cop')
      .insert({
        id: createId(),
        ...cop,
        createdBy: userId
      })
      .select()
      .single<Cop>()
  },

  async update(id: string, updates: Omit<Cop, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>, userId: string) {
    return supabase.from('Cop')
      .update({
        ...updates,
        updatedAt: new Date(),
        updatedBy: userId
      })
      .eq('id', id)
      .select()
      .single<Cop>()
  },

  async delete(id: string, userId: string) {
    return supabase.from('Cop')
      .update({
        deletedAt: new Date(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

