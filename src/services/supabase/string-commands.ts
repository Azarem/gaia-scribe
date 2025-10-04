import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const stringCommands = {
  async getByStringType(stringTypeId: string) {
    return supabase
      .from('StringCommand')
      .select('*')
      .eq('stringTypeId', stringTypeId)
      .is('deletedAt', null)
      .order('code', { ascending: true })
  },

  async getByProject(projectId: string) {
    return supabase
      .from('StringCommand')
      .select('*,stringType:StringType!inner(id,projectId,deletedAt)')
      .eq('stringType.projectId', projectId)
      .is('deletedAt', null)
      .is('stringType.deletedAt', null)
  },

  async getById(id: string) {
    return supabase
      .from('StringCommand')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(command: { code: number; mnemonic: string; types?: string[]; delimiter?: number; halt?: boolean; parts?: string[]; meta?: any; stringTypeId: string }, userId: string) {
    const commandId = createId()
    return (supabase as any)
      .from('StringCommand')
      .insert({
        id: commandId,
        code: command.code,
        mnemonic: command.mnemonic,
        types: command.types || [],
        delimiter: command.delimiter,
        halt: command.halt,
        parts: command.parts || [],
        meta: command.meta,
        stringTypeId: command.stringTypeId,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { code?: number; mnemonic?: string; types?: string[]; delimiter?: number; halt?: boolean; parts?: string[]; meta?: any }, userId: string) {
    return (supabase as any)
      .from('StringCommand')
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
      .from('StringCommand')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

