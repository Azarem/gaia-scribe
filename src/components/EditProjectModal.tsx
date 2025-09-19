import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import { db } from '../lib/supabase'
import type { ScribeProject } from '@prisma/client'

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: ScribeProject | null
  onProjectUpdated?: (project: ScribeProject) => void
}

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
}: EditProjectModalProps) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name)
      setIsPublic(project.isPublic)
    } else {
      setName('')
      setIsPublic(false)
    }
    setError(null)
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !project) return
    
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Project name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await db.projects.update(
        project.id,
        {
          name: trimmedName,
          isPublic: isPublic
        },
        user.id
      )

      if (error) {
        if (error.message && error.message.includes('already exists')) {
          setError(`A project with the name "${trimmedName}" already exists. Please choose a different name.`)
        } else {
          setError('Failed to update project. Please try again.')
        }
        return
      }

      if (data) {
        onProjectUpdated?.(data)
        onClose()
      }
    } catch (err) {
      console.error('Error updating project:', err)
      setError('Failed to update project. Please try again.')
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
      title="Edit Project" 
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Project Name */}
        <div className="mb-4">
          <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            required
          />
        </div>

        {/* Visibility */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visibility
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="visibility"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">
                Private - Only you can see this project
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="visibility"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">
                Public - Anyone can view this project
              </span>
            </label>
          </div>
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
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Updating...
              </>
            ) : (
              'Update Project'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
