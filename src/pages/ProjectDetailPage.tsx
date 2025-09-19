import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { db } from '../lib/supabase'
import { Calendar, Edit, Trash2, ArrowLeft, Globe, Lock } from 'lucide-react'
import type { ScribeProject } from '@prisma/client'
import EditProjectModal from '../components/EditProjectModal'
import DeleteProjectModal from '../components/DeleteProjectModal'
import SectionCard from '../components/SectionCard'
import { useProjectSectionCounts } from '../hooks/useProjectSectionCounts'
import { PROJECT_SECTIONS } from '../lib/project-sections'
import clsx from 'clsx'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [project, setProject] = useState<ScribeProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch section counts
  const { counts, loading: countsLoading } = useProjectSectionCounts(id)

  // Load project details
  useEffect(() => {
    if (!id) {
      setError('Project ID is required')
      setLoading(false)
      return
    }

    const loadProject = async () => {
      try {
        const { data, error } = await db.projects.getById(id)
        
        if (error) {
          setError('Failed to load project')
          return
        }

        if (!data) {
          setError('Project not found')
          return
        }

        setProject(data)
      } catch (err) {
        console.error('Error loading project:', err)
        setError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [id])

  const isOwner = user && project && user.id === project.createdBy

  const handleBack = () => {
    navigate('/dashboard')
  }

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleProjectUpdated = (updatedProject: ScribeProject) => {
    setProject(updatedProject)
  }

  const handleProjectDeleted = () => {
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading project...</span>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested project could not be found.'}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <div className="flex items-center mt-1 space-x-4">
                  <div className={clsx(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    project.isPublic 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  )}>
                    {project.isPublic ? (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Sections</h2>
          <p className="text-gray-600">
            Manage different aspects of your project data. Click on any section to view and edit its contents.
          </p>
        </div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {PROJECT_SECTIONS.map((section) => (
            <SectionCard
              key={section.key}
              projectId={project.id}
              sectionName={section.name}
              sectionKey={section.key}
              icon={section.icon}
              count={counts[section.key as keyof typeof counts] || 0}
              description={section.description}
              loading={countsLoading}
            />
          ))}
        </div>

        {/* Project Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Information</h3>

            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Visibility</dt>
                <dd className="mt-1">
                  <span className={clsx(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    project.isPublic
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  )}>
                    {project.isPublic ? 'Public' : 'Private'}
                  </span>
                </dd>
              </div>

              {project.gameRomId && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Game ROM ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{project.gameRomId}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(project.createdAt).toLocaleString()}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : 'Never'}
                </dd>
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm font-medium text-gray-900">
                  {project.meta && (project.meta as any)?.importSource ? 'Imported' : 'Created'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Items</span>
                <span className="text-sm font-medium text-gray-900">
                  {countsLoading ? '...' : Object.values(counts).reduce((sum, count) => sum + count, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        {project.meta && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
              <div className="text-sm text-gray-600">
                <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(project.meta, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        project={project}
        onProjectUpdated={handleProjectUpdated}
      />

      <DeleteProjectModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        project={project}
        onProjectDeleted={handleProjectDeleted}
      />
    </div>
  )
}
