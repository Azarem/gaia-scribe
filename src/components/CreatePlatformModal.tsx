import { useState, useCallback } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import { db } from '../services/supabase'
import { Plus, AlertCircle, Cpu } from 'lucide-react'
import type { Platform } from '@prisma/client'

interface CreatePlatformModalProps {
  isOpen: boolean
  onClose: () => void
  onPlatformCreated?: (platform: Platform) => void
}

export default function CreatePlatformModal({
  isOpen,
  onClose,
  onPlatformCreated,
}: CreatePlatformModalProps) {
  const { user } = useAuthStore()
  const [platformName, setPlatformName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreatePlatform = useCallback(async () => {
    if (!user?.id) return

    const trimmedName = platformName.trim()
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

    setIsCreating(true)
    setError(null)

    try {
      // Create the platform
      const { data: newPlatform, error: createError } = await db.platforms.create(
        {
          name: trimmedName,
          isPublic,
          meta: null,
          platformBranchId: null
        },
        user.id
      )

      if (createError || !newPlatform) {
        throw new Error(createError?.message || 'Failed to create platform')
      }

      // Success!
      onPlatformCreated?.(newPlatform)
      onClose()
      
      // Reset form
      setPlatformName('')
      setIsPublic(false)
      setError(null)
      
    } catch (err) {
      console.error('Error creating platform:', err)
      setError(err instanceof Error ? err.message : 'Failed to create platform')
    } finally {
      setIsCreating(false)
    }
  }, [user?.id, platformName, isPublic, onPlatformCreated, onClose])

  const handleClose = useCallback(() => {
    if (!isCreating) {
      setPlatformName('')
      setIsPublic(false)
      setError(null)
      onClose()
    }
  }, [isCreating, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Platform"
      className="max-w-md"
      closeOnBackdropClick={!isCreating}
    >
      <div className="p-6">
        {/* Platform Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Cpu className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Platform Name Input */}
        <div className="mb-6">
          <label htmlFor="platformName" className="block text-sm font-medium text-gray-700 mb-2">
            Platform Name *
          </label>
          <input
            id="platformName"
            type="text"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., NES, SNES, Genesis..."
            disabled={isCreating}
            maxLength={100}
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter a descriptive name for your platform (e.g., "NES", "SNES", "Genesis").
          </p>
        </div>

        {/* Public/Private Toggle */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isCreating}
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
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleCreatePlatform}
            disabled={!platformName.trim() || isCreating}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center ${
              platformName.trim() && !isCreating
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Platform
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
