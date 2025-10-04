import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const rewrites = {
  async getByProject(projectId: string) {
    return supabase
      .from('Rewrite')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('location', { ascending: true })
  },

  async getById(id: string) {
    return supabase
      .from('Rewrite')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(rewrite: { location: number; value: number; projectId: string }, userId: string) {
    const rewriteId = createId()
    return (supabase as any)
      .from('Rewrite')
      .insert({
        id: rewriteId,
        location: rewrite.location,
        value: rewrite.value,
        projectId: rewrite.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { location?: number; value?: number }, userId: string) {
    return (supabase as any)
      .from('Rewrite')
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
      .from('Rewrite')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

