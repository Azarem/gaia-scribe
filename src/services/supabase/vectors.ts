import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const vectors = {
  async getByPlatform(platformId: string) {
    return supabase
      .from('Vector')
      .select('*')
      .eq('platformId', platformId)
      .is('deletedAt', null)
      .order('address', { ascending: true })
  },

  async create(vector: any, userId: string) {
    const id = createId()
    return supabase
      .from('Vector')
      .insert({
        id,
        ...vector,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async createBatch(vectors: any[], userId: string) {
    const vectorsToInsert = vectors.map(vector => ({
      id: createId(),
      ...vector,
      createdBy: userId,
    }))

    return supabase
      .from('Vector')
      .insert(vectorsToInsert)
      .select()
  },

  async getById(id: string) {
    return supabase
      .from('Vector')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async update(id: string, updates: { name?: string; address?: number; isEntry?: boolean; meta?: any }, userId: string) {
    return (supabase as any)
      .from('Vector')
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
      .from('Vector')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

