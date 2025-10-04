import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const structs = {
  async getByProject(projectId: string) {
    return supabase
      .from('Struct')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
  },

  async getById(id: string) {
    return supabase
      .from('Struct')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(struct: { name: string; types?: string[]; delimiter?: number; discriminator?: number; parent?: string; parts?: string[]; meta?: any; projectId: string }, userId: string) {
    const structId = createId()
    return (supabase as any)
      .from('Struct')
      .insert({
        id: structId,
        name: struct.name,
        types: struct.types || [],
        delimiter: struct.delimiter,
        discriminator: struct.discriminator,
        parent: struct.parent,
        parts: struct.parts || [],
        meta: struct.meta,
        projectId: struct.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { name?: string; types?: string[]; delimiter?: number; discriminator?: number; parent?: string; parts?: string[]; meta?: any }, userId: string) {
    return (supabase as any)
      .from('Struct')
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
      .from('Struct')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

