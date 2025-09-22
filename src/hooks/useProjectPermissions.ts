import { useState, useEffect } from 'react'
import { projectPermissions } from '../lib/permissions'

export interface ProjectPermissionsState {
  canView: boolean
  canEdit: boolean
  canManage: boolean
  loading: boolean
  error: string | null
}

/**
 * React hook to check project permissions
 * @param projectId - The project ID to check permissions for
 * @returns ProjectPermissionsState with current permissions and loading state
 */
export function useProjectPermissions(projectId: string | null): ProjectPermissionsState {
  const [state, setState] = useState<ProjectPermissionsState>({
    canView: false,
    canEdit: false,
    canManage: false,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!projectId) {
      setState({
        canView: false,
        canEdit: false,
        canManage: false,
        loading: false,
        error: null
      })
      return
    }

    let isMounted = true

    const loadPermissions = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))
        
        const permissions = await projectPermissions.getPermissions(projectId)
        
        if (isMounted) {
          setState({
            canView: permissions.canView,
            canEdit: permissions.canEdit,
            canManage: permissions.canManage,
            loading: false,
            error: permissions.errors.length > 0 ? permissions.errors[0] : null
          })
        }
      } catch (err) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load permissions'
          }))
        }
      }
    }

    loadPermissions()

    return () => {
      isMounted = false
    }
  }, [projectId])

  return state
}

/**
 * Hook to check if user can edit project content
 * @param projectId - The project ID to check
 * @returns Object with canEdit boolean and loading state
 */
export function useCanEditProject(projectId: string | null) {
  const { canEdit, loading, error } = useProjectPermissions(projectId)
  return { canEdit, loading, error }
}

/**
 * Hook to check if user can manage project
 * @param projectId - The project ID to check
 * @returns Object with canManage boolean and loading state
 */
export function useCanManageProject(projectId: string | null) {
  const { canManage, loading, error } = useProjectPermissions(projectId)
  return { canManage, loading, error }
}

/**
 * Hook to refresh permissions cache
 * @param projectId - The project ID to refresh permissions for
 * @returns Function to refresh permissions
 */
export function useRefreshPermissions(projectId: string | null) {
  return () => {
    if (projectId) {
      projectPermissions.clearCache(projectId)
    }
  }
}
