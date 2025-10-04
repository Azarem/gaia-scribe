import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const blocks = {
  async getByProject(projectId: string) {
    return supabase
      .from('Block')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
      .limit(3000)
  },

  async getById(id: string) {
    return supabase
      .from('Block')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(block: { name: string; movable?: boolean; group?: string; scene?: string; postProcess?: string; meta?: any; projectId: string }, userId: string) {
    const blockId = createId()
    return (supabase as any)
      .from('Block')
      .insert({
        id: blockId,
        name: block.name,
        movable: block.movable || false,
        group: block.group,
        scene: block.scene,
        postProcess: block.postProcess,
        meta: block.meta,
        projectId: block.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { name?: string; movable?: boolean; group?: string; scene?: string; postProcess?: string; meta?: any }, userId: string) {
    return (supabase as any)
      .from('Block')
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
      .from('Block')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

