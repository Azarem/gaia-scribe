import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const strings = {
  async getByProject(projectId: string) {
    return supabase
      .from('StringType')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
  },

  async getById(id: string) {
    return supabase
      .from('StringType')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(stringType: { name: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[]; projectId: string }, userId: string) {
    const stringTypeId = createId()
    return (supabase as any)
      .from('StringType')
      .insert({
        id: stringTypeId,
        name: stringType.name,
        delimiter: stringType.delimiter,
        shiftType: stringType.shiftType,
        terminator: stringType.terminator,
        greedy: stringType.greedy,
        meta: stringType.meta,
        characterMap: stringType.characterMap || [],
        projectId: stringType.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { name?: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[] }, userId: string) {
    return (supabase as any)
      .from('StringType')
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
      .from('StringType')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

