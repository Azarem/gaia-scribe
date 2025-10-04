import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const addressingModes = {
  async getByPlatform(platformId: string) {
    return supabase
      .from('AddressingMode')
      .select('*')
      .eq('platformId', platformId)
      .is('deletedAt', null)
      .order('name', { ascending: true })
  },

  async create(addressingMode: any, userId: string) {
    const id = createId()
    return supabase
      .from('AddressingMode')
      .insert({
        id,
        ...addressingMode,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async createBatch(addressingModes: any[], userId: string) {
    const addressingModesToInsert = addressingModes.map(mode => ({
      id: createId(),
      ...mode,
      createdBy: userId,
    }))

    return supabase
      .from('AddressingMode')
      .insert(addressingModesToInsert)
      .select()
  },

  async getById(id: string) {
    return supabase
      .from('AddressingMode')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async update(id: string, updates: { name?: string; code?: string; size?: number; format?: string; pattern?: string; meta?: any }, userId: string) {
    return (supabase as any)
      .from('AddressingMode')
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
      .from('AddressingMode')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

