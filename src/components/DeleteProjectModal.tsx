import { useState } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'
import { db } from '../services/supabase'
import type { ScribeProject } from '@prisma/client'

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: ScribeProject | null
  onProjectDeleted?: () => void
}

export default function DeleteProjectModal({
  isOpen,
  onClose,
  project,
  onProjectDeleted,
}: DeleteProjectModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState('')

  const expectedConfirmation = project?.name || ''
  const isConfirmed = confirmationText === expectedConfirmation

  const handleDelete = async () => {
    if (!user?.id || !project || !isConfirmed) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await db.projects.delete(project.id, user.id)

      if (error) {
        setError('Failed to delete project. Please try again.')
        return
      }

      onProjectDeleted?.()
      onClose()
    } catch (err) {
      console.error('Error deleting project:', err)
      setError('Failed to delete project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setConfirmationText('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Delete Project" 
      className="max-w-md"
    >
      <div className="p-6">
        {/* Warning Icon */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Delete Project
            </h3>
          </div>
        </div>

        {/* Warning Message */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            This action cannot be undone. This will permanently delete the project{' '}
            <span className="font-semibold text-gray-900">"{project?.name}"</span>{' '}
            and all of its data.
          </p>
          
          <p className="text-sm text-gray-600 mb-4">
            Please type <span className="font-semibold text-gray-900">{expectedConfirmation}</span> to confirm.
          </p>

          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Type project name to confirm"
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
            disabled={loading || !isConfirmed}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Deleting...
              </>
            ) : (
              'Delete Project'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
