import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const blockParts = {
  async getByProject(projectId: string) {
    return supabase
      .from('BlockPart')
      .select('*,block:Block!inner(id,projectId,deletedAt)')
      .eq('block.projectId', projectId)
      .is('deletedAt', null)
      .is('block.deletedAt', null)
      .limit(8000)
  },

  async getByBlock(blockId: string) {
    return supabase
      .from('BlockPart')
      .select('*')
      .eq('blockId', blockId)
      .is('deletedAt', null)
      .order('index', { ascending: true })
  },

  async getById(id: string) {
    return supabase
      .from('BlockPart')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(part: { name: string; location: number; size: number; type: string; index?: number; blockId: string }, userId: string) {
    const partId = createId()
    return (supabase as any)
      .from('BlockPart')
      .insert({
        id: partId,
        name: part.name,
        location: part.location,
        size: part.size,
        type: part.type,
        index: part.index,
        blockId: part.blockId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { name?: string; location?: number; size?: number; type?: string; index?: number }, userId: string) {
    return (supabase as any)
      .from('BlockPart')
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
      .from('BlockPart')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

