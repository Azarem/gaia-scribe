import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const files = {
  async getByProject(projectId: string) {
    return supabase
      .from('File')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
      .limit(3000)
  },

  async getById(id: string) {
    return supabase
      .from('File')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(file: { name: string; location: number; size: number; type: string; group?: string; scene?: string; compressed?: boolean; upper?: boolean; meta?: any; projectId: string }, userId: string) {
    const fileId = createId()
    return (supabase as any)
      .from('File')
      .insert({
        id: fileId,
        name: file.name,
        location: file.location,
        size: file.size,
        type: file.type,
        group: file.group,
        scene: file.scene,
        compressed: file.compressed,
        upper: file.upper,
        meta: file.meta,
        projectId: file.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { name?: string; location?: number; size?: number; type?: string; group?: string; scene?: string; compressed?: boolean; upper?: boolean; meta?: any }, userId: string) {
    return (supabase as any)
      .from('File')
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
      .from('File')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

