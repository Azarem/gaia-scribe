import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const labels = {
  async getByProject(projectId: string) {
    return supabase
      .from('Label')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('location', { ascending: true })
      .limit(3000)
  },

  async getById(id: string) {
    return supabase
      .from('Label')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(label: { location: number; label: string; projectId: string }, userId: string) {
    const labelId = createId()
    return (supabase as any)
      .from('Label')
      .insert({
        id: labelId,
        location: label.location,
        label: label.label,
        projectId: label.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { location?: number; label?: string }, userId: string) {
    return (supabase as any)
      .from('Label')
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
      .from('Label')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

