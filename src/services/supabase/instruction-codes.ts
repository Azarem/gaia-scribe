import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const instructionCodes = {
  async getByGroup(groupId: string) {
    return supabase
      .from('InstructionCode')
      .select('*')
      .eq('groupId', groupId)
      .is('deletedAt', null)
      .order('code', { ascending: true })
  },

  async getByPlatform(platformId: string) {
    return supabase
      .from('InstructionCode')
      .select(`
        *,
        group:InstructionGroup!inner(id, name, platformId),
        mode:AddressingMode!inner(id, name, code)
      `)
      .eq('group.platformId', platformId)
      .is('deletedAt', null)
      .order('code', { ascending: true })
  },

  async create(instructionCode: any, userId: string) {
    const id = createId()
    return supabase
      .from('InstructionCode')
      .insert({
        id,
        ...instructionCode,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async createBatch(instructionCodes: any[], userId: string) {
    const instructionCodesToInsert = instructionCodes.map(code => ({
      id: createId(),
      ...code,
      createdBy: userId,
    }))

    return supabase
      .from('InstructionCode')
      .insert(instructionCodesToInsert)
      .select()
  },

  async getById(id: string) {
    return supabase
      .from('InstructionCode')
      .select('*, group:InstructionGroup!inner(id, name), mode:AddressingMode!inner(id, name, code)')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async update(id: string, updates: { code?: number; cycles?: number; meta?: any; groupId?: string; modeId?: string }, userId: string) {
    return (supabase as any)
      .from('InstructionCode')
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
      .from('InstructionCode')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

