import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const instructionGroups = {
  async getByPlatform(platformId: string) {
    return supabase
      .from('InstructionGroup')
      .select('*')
      .eq('platformId', platformId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
  },

  async create(instructionGroup: any, userId: string) {
    const id = createId()
    return supabase
      .from('InstructionGroup')
      .insert({
        id,
        ...instructionGroup,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async createBatch(instructionGroups: any[], userId: string) {
    const instructionGroupsToInsert = instructionGroups.map(group => ({
      id: createId(),
      ...group,
      createdBy: userId,
    }))

    return supabase
      .from('InstructionGroup')
      .insert(instructionGroupsToInsert)
      .select()
  },

  async getById(id: string) {
    return supabase
      .from('InstructionGroup')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async update(id: string, updates: { name?: string; meta?: any }, userId: string) {
    return (supabase as any)
      .from('InstructionGroup')
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
      .from('InstructionGroup')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

