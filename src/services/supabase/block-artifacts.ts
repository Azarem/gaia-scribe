import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const blockArtifacts = {
  async getByBlock(blockId: string) {
    return supabase
      .from('BlockArtifact')
      .select('*')
      .eq('blockId', blockId)
      .is('deletedAt', null)
      .single()
  },

  async getById(id: string) {
    return supabase
      .from('BlockArtifact')
      .select('*')
      .eq('id', id)
      .is('deletedAt', null)
      .single()
  },

  async create(artifact: { blockId: string; content: string; meta?: any }, userId: string) {
    const artifactId = createId()
    return (supabase as any)
      .from('BlockArtifact')
      .insert({
        id: artifactId,
        blockId: artifact.blockId,
        content: artifact.content,
        meta: artifact.meta,
        createdBy: userId,
      })
      .select()
      .single()
  },

  async update(id: string, updates: { content?: string; meta?: any }, userId: string) {
    return (supabase as any)
      .from('BlockArtifact')
      .update({
        ...updates,
        updatedBy: userId,
      })
      .eq('id', id)
      .select()
      .single()
  },

  async upsert(artifact: { blockId: string; content: string; meta?: any; createdBy: string; updatedBy: string }) {
    return (supabase as any)
      .from('BlockArtifact')
      .upsert({
        blockId: artifact.blockId,
        content: artifact.content,
        meta: artifact.meta,
        createdBy: artifact.createdBy,
        updatedBy: artifact.updatedBy,
      }, { onConflict: 'blockId' })
      .select()
      .single()
  },

  async bulkUpsert(artifacts: Array<{ blockId: string; content: string; meta?: any; createdBy: string; updatedBy: string }>) {
    return (supabase as any)
      .from('BlockArtifact')
      .upsert(artifacts.map(artifact => ({
        blockId: artifact.blockId,
        content: artifact.content,
        meta: artifact.meta,
        createdBy: artifact.createdBy,
        updatedBy: artifact.updatedBy,
      })), { onConflict: 'blockId' })
      .select()
  },

  async delete(id: string, userId: string) {
    return (supabase as any)
      .from('BlockArtifact')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },
}

