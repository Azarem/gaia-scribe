import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { db } from '../lib/supabase'

export function usePlatformPermissions(platformId: string | null) {
  const { user } = useAuthStore()
  const [canManage, setCanManage] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!platformId || !user) {
      setCanManage(false)
      setCanEdit(false)
      setLoading(false)
      return
    }

    const checkPermissions = async () => {
      try {
        setLoading(true)

        // Get platform details
        const { data: platform, error } = await db.platforms.getById(platformId)

        if (error || !platform) {
          setCanManage(false)
          setCanEdit(false)
          return
        }

        // Check if user is the owner
        const isOwner = platform.createdBy === user.id

        // For now, only owners can manage and edit platforms
        // This can be extended later to support collaborators
        setCanManage(isOwner)
        setCanEdit(isOwner)

      } catch (error) {
        console.error('Error checking platform permissions:', error)
        setCanManage(false)
        setCanEdit(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermissions()
  }, [platformId, user])

  return { canManage, canEdit, loading }
}

// Convenience hook for just checking edit permissions
export function useCanEditPlatform(platformId: string | null) {
  const { canEdit, loading } = usePlatformPermissions(platformId)
  return { canEdit, loading }
}
