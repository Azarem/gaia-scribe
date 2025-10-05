import { Block } from '@prisma/client'
import { supabase } from '../../lib/supabase'
//import { createId } from '@paralleldrive/cuid2'

export const blocks = {
  async getByProject(projectId: string) {
    return supabase.from('Block')
      .select<'*', Block>()
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
      .limit(3000)
  },

  async getById(id: string) {
    return supabase.from('Block')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single<Block>()
  },

  async create(block: Omit<Block, 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>, userId: string) {
    return supabase.from('Block')
      .insert({
        ...block,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      })
      .select()
      .single<Block>()
  },

  async update(id: string, updates: { name?: string; movable?: boolean; group?: string; scene?: string; postProcess?: string; meta?: any }, userId: string) {
    return supabase.from('Block')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      })
      .eq('id', id)
      .select()
      .single<Block>()
  },

  async delete(id: string, userId: string) {
    return supabase.from('Block')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

