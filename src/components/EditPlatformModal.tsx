import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import { db } from '../services/supabase'
import type { Platform } from '@prisma/client'

interface EditPlatformModalProps {
  isOpen: boolean
  onClose: () => void
  platform: Platform | null
  onPlatformUpdated?: (platform: Platform) => void
}

export default function EditPlatformModal({
  isOpen,
  onClose,
  platform,
  onPlatformUpdated,
}: EditPlatformModalProps) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when platform changes
  useEffect(() => {
    if (platform) {
      setName(platform.name)
      setIsPublic(platform.isPublic)
    } else {
      setName('')
      setIsPublic(false)
    }
    setError(null)
  }, [platform])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !platform) return
    
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Platform name is required')
      return
    }

    if (trimmedName.length < 2) {
      setError('Platform name must be at least 2 characters long')
      return
    }

    if (trimmedName.length > 100) {
      setError('Platform name must be 100 characters or less')
      return
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmedName)) {
      setError('Platform name can only contain letters, numbers, spaces, hyphens, underscores, and periods')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: updatedPlatform, error: updateError } = await db.platforms.update(
        platform.id,
        {
          name: trimmedName,
          isPublic
        },
        user.id
      )

      if (updateError || !updatedPlatform) {
        throw new Error(updateError?.message || 'Failed to update platform')
      }

      onPlatformUpdated?.(updatedPlatform)
      onClose()
    } catch (err) {
      console.error('Error updating platform:', err)
      setError(err instanceof Error ? err.message : 'Failed to update platform')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Edit Platform" 
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Platform Name */}
        <div className="mb-4">
          <label htmlFor="platform-name" className="block text-sm font-medium text-gray-700 mb-2">
            Platform Name
          </label>
          <input
            id="platform-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter platform name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            required
          />
        </div>

        {/* Public/Private Toggle */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Make this platform public</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Public platforms can be viewed and used by other users.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
