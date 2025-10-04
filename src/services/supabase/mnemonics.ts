import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const mnemonics = {
  async getByProject(projectId: string) {
    return supabase
      .from('GameMnemonic')
      .select('*')
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('address', { ascending: true })
      .limit(2000)
  },

  async getById(id: string) {
    return supabase
      .from('GameMnemonic')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(mnemonic: { address: number; mnemonic: string; meta?: any; projectId: string }, userId: string) {
    const mnemonicId = createId()
    return (supabase as any)
      .from('GameMnemonic')
      .insert({
        id: mnemonicId,
        address: mnemonic.address,
        mnemonic: mnemonic.mnemonic,
        meta: mnemonic.meta,
        projectId: mnemonic.projectId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { address?: number; mnemonic?: string; meta?: any }, userId: string) {
    return (supabase as any)
      .from('GameMnemonic')
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
      .from('GameMnemonic')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

