import { supabase } from './supabase'

/**
 * Permission checking utilities for project access control
 * 
 * These functions call the database permission functions to determine
 * what actions a user can perform on a project.
 */

export interface PermissionResult {
  allowed: boolean
  error?: string
}

/**
 * Check if the current user can view a project
 * @param projectId - The project ID to check
 * @returns Promise<PermissionResult>
 */
export async function canViewProject(projectId: string): Promise<PermissionResult> {
  try {
    const { data, error } = await supabase.rpc('can_view_project', { projectid: projectId })
    
    if (error) {
      console.error('Error checking view permission:', error)
      return { allowed: false, error: error.message }
    }
    
    return { allowed: Boolean(data) }
  } catch (err) {
    console.error('Error checking view permission:', err)
    return { allowed: false, error: 'Failed to check permissions' }
  }
}

/**
 * Check if the current user can edit project content
 * This includes editing individual pieces/sections/content within the project
 * @param projectId - The project ID to check
 * @returns Promise<PermissionResult>
 */
export async function canEditProject(projectId: string): Promise<PermissionResult> {
  try {
    const { data, error } = await supabase.rpc('can_edit_project', { projectid: projectId })
    
    if (error) {
      console.error('Error checking edit permission:', error)
      return { allowed: false, error: error.message }
    }
    
    return { allowed: Boolean(data) }
  } catch (err) {
    console.error('Error checking edit permission:', err)
    return { allowed: false, error: 'Failed to check permissions' }
  }
}

/**
 * Check if the current user can manage a project
 * This includes project settings, contributor management, and project-level operations
 * @param projectId - The project ID to check
 * @returns Promise<PermissionResult>
 */
export async function canManageProject(projectId: string): Promise<PermissionResult> {
  try {
    const { data, error } = await supabase.rpc('can_manage_project', { projectid: projectId })
    
    if (error) {
      console.error('Error checking manage permission:', error)
      return { allowed: false, error: error.message }
    }
    
    return { allowed: Boolean(data) }
  } catch (err) {
    console.error('Error checking manage permission:', err)
    return { allowed: false, error: 'Failed to check permissions' }
  }
}

/**
 * Check if the current user can edit a specific block
 * @param blockId - The block ID to check
 * @returns Promise<PermissionResult>
 */
export async function canEditProjectBlock(blockId: string): Promise<PermissionResult> {
  try {
    const { data, error } = await supabase.rpc('can_edit_project_block', { blockid: blockId })
    
    if (error) {
      console.error('Error checking block edit permission:', error)
      return { allowed: false, error: error.message }
    }
    
    return { allowed: Boolean(data) }
  } catch (err) {
    console.error('Error checking block edit permission:', err)
    return { allowed: false, error: 'Failed to check permissions' }
  }
}

/**
 * Batch check multiple permissions for a project
 * @param projectId - The project ID to check
 * @returns Promise with all permission results
 */
export async function checkProjectPermissions(projectId: string): Promise<{
  canView: boolean
  canEdit: boolean
  canManage: boolean
  errors: string[]
}> {
  const [viewResult, editResult, manageResult] = await Promise.all([
    canViewProject(projectId),
    canEditProject(projectId),
    canManageProject(projectId)
  ])
  
  const errors: string[] = []
  if (viewResult.error) errors.push(viewResult.error)
  if (editResult.error) errors.push(editResult.error)
  if (manageResult.error) errors.push(manageResult.error)
  
  return {
    canView: viewResult.allowed,
    canEdit: editResult.allowed,
    canManage: manageResult.allowed,
    errors
  }
}

/**
 * Hook-like function to get project permissions with caching
 * This can be used in React components to get permissions with automatic updates
 */
export class ProjectPermissions {
  private cache = new Map<string, { permissions: any; timestamp: number }>()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  async getPermissions(projectId: string) {
    const cached = this.cache.get(projectId)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.permissions
    }
    
    const permissions = await checkProjectPermissions(projectId)
    this.cache.set(projectId, { permissions, timestamp: now })
    
    return permissions
  }
  
  clearCache(projectId?: string) {
    if (projectId) {
      this.cache.delete(projectId)
    } else {
      this.cache.clear()
    }
  }
}

// Global instance for use across the app
export const projectPermissions = new ProjectPermissions()
