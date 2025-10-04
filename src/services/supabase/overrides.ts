import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const overrides = {
  async getByProject(projectId: string) {
    return supabase
      .from('Override')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('location', { ascending: true })
  },

  async getById(id: string) {
    return supabase
      .from('Override')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(override: { location: number; register?: string; value: number; projectId: string }, userId: string) {
    const overrideId = createId()
    return (supabase as any)
      .from('Override')
      .insert({
        id: overrideId,
        location: override.location,
        register: override.register || 'A',
        value: override.value,
        projectId: override.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { location?: number; register?: string; value?: number }, userId: string) {
    return (supabase as any)
      .from('Override')
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
      .from('Override')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

