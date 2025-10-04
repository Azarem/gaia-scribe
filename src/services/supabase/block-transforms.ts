import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const blockTransforms = {
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
}

