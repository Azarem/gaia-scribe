import { BlockPart } from '@prisma/client'
import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const blockParts = {
  async getByProject(projectId: string) {
    return supabase.from('BlockPart')
      .select<'*,block:Block!inner(id,projectId,deletedAt)', BlockPart>()
      .eq('block.projectId', projectId)
      .is('deletedAt', null)
      .is('block.deletedAt', null)
      .limit(8000)
  },

  async getByBlock(blockId: string) {
    return supabase.from('BlockPart')
      .select<'*', BlockPart>()
      .eq('blockId', blockId)
      .is('deletedAt', null)
      .order('index', { ascending: true })
  },

  async getById(id: string) {
    return supabase.from('BlockPart')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single<BlockPart>()
  },

  async create(part: Omit<BlockPart, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'> & { id?: string }, userId: string) {
    if(!part.id) part.id = createId()
    return supabase.from('BlockPart')
      .insert({
        ...part,
        createdBy: userId,
      })
      .select()
      .single<BlockPart>()
  },

  async update(id: string, updates: { name?: string; location?: number; size?: number; type?: string; index?: number }, userId: string) {
    return supabase.from('BlockPart')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      })
      .eq('id', id)
      .select()
      .single<BlockPart>()
  },

  async delete(id: string, userId: string) {
    return supabase.from('BlockPart')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

