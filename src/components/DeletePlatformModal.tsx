import { useState } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import { db } from '../services/supabase'
import { AlertTriangle } from 'lucide-react'
import type { Platform } from '@prisma/client'

interface DeletePlatformModalProps {
  isOpen: boolean
  onClose: () => void
  platform: Platform | null
  onPlatformDeleted?: () => void
}

export default function DeletePlatformModal({
  isOpen,
  onClose,
  platform,
  onPlatformDeleted,
}: DeletePlatformModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (!user?.id || !platform) return
    
    if (confirmText !== platform.name) {
      setError('Platform name does not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await db.platforms.delete(platform.id, user.id)

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete platform')
      }

      onPlatformDeleted?.()
      onClose()
    } catch (err) {
      console.error('Error deleting platform:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete platform')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setConfirmText('')
      setError(null)
      onClose()
    }
  }

  const isConfirmValid = confirmText === platform?.name

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Delete Platform" 
      className="max-w-md"
    >
      <div className="p-6">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>

        {/* Warning Message */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Delete Platform
          </h3>
          <p className="text-sm text-gray-500">
            Are you sure you want to delete <strong>{platform?.name}</strong>? 
            This action cannot be undone and will permanently remove all platform data.
          </p>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label htmlFor="confirm-name" className="block text-sm font-medium text-gray-700 mb-2">
            Type the platform name to confirm deletion:
          </label>
          <input
            id="confirm-name"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={platform?.name || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={loading}
          />
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
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || !isConfirmValid}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Platform'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
