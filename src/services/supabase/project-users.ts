import { supabase } from '../../lib/supabase'
import { createId } from '@paralleldrive/cuid2'

export const projectUsers = {
  async getByProject(projectId: string) {
    return supabase
      .from('ProjectUser')
      .select(`
        *,
        user:User!ProjectUser_userId_fkey (
          id,
          name,
          email,
          avatarUrl
        )
      `)
      .eq('projectId', projectId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: true })
  },

  async create(projectUser: { projectId: string; userId: string; role?: string }, createdBy: string) {
    const projectUserId = createId()
    return (supabase as any)
      .from('ProjectUser')
      .insert({
        id: projectUserId,
        projectId: projectUser.projectId,
        userId: projectUser.userId,
        role: projectUser.role || 'contributor',
        createdBy,
      })
      .select(`
        *,
        user:User!ProjectUser_userId_fkey (
          id,
          name,
          email,
          avatarUrl
        )
      `)
      .single()
  },

  async update(id: string, updates: { role?: string }, userId: string) {
    return supabase.from('ProjectUser')
      .update({
        ...updates,
        updatedBy: userId,
      })
      .eq('id', id)
      .select(`
        *,
        user:User!ProjectUser_userId_fkey (
          id,
          name,
          email,
          avatarUrl
        )
      `)
      .single()
  },

  async delete(id: string, userId: string) {
    return supabase.from('ProjectUser')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      })
      .eq('id', id)
  },

  async removeByUserAndProject(projectId: string, userId: string, deletedBy: string) {
    return supabase.from('ProjectUser')
      .update({
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .eq('projectId', projectId)
      .eq('userId', userId)
      .is('deletedAt', null)
  },
}

