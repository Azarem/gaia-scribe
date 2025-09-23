import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { Calendar, Edit, Trash2, ArrowLeft, Globe, Lock, Cpu, Database } from 'lucide-react'
import type { Platform } from '@prisma/client'
import EditPlatformModal from '../components/EditPlatformModal'
import DeletePlatformModal from '../components/DeletePlatformModal'
import SectionCard from '../components/SectionCard'
import { usePlatformSectionCounts } from '../hooks/usePlatformSectionCounts'
import { usePlatformPermissions } from '../hooks/usePlatformPermissions'
import { PLATFORM_SECTIONS } from '../lib/platform-sections'
import { scaffoldPlatformData, type ScaffoldingResult } from '../lib/platform-scaffolding'
import { useAuthStore } from '../stores/auth-store'

export default function PlatformDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [platform, setPlatform] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [scaffolding, setScaffolding] = useState(false)
  const [scaffoldingResult, setScaffoldingResult] = useState<ScaffoldingResult | null>(null)

  // Fetch section counts
  const { counts, loading: countsLoading } = usePlatformSectionCounts(id)

  // Check permissions
  const { canManage, loading: permissionsLoading } = usePlatformPermissions(id || null)

  // Load platform details
  useEffect(() => {
    if (!id) {
      setError('Platform ID is required')
      setLoading(false)
      return
    }

    const loadPlatform = async () => {
      try {
        const { data, error } = await db.platforms.getById(id)
        
        if (error) {
          setError('Failed to load platform')
          return
        }

        if (!data) {
          setError('Platform not found')
          return
        }

        setPlatform(data)
      } catch (err) {
        console.error('Error loading platform:', err)
        setError('Failed to load platform')
      } finally {
        setLoading(false)
      }
    }

    loadPlatform()

    // Set up realtime subscription for platform changes
    if (id) {
      const channel = supabase
        .channel(`platform-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Platform',
            filter: `id=eq.${id}`
          },
          (payload) => {
            logger.platform.realtime('Platform update received', { eventType: payload.eventType, platformId: id })

            if (payload.eventType === 'UPDATE' && payload.new) {
              setPlatform(payload.new as Platform)
            } else if (payload.eventType === 'DELETE') {
              // Platform was deleted, redirect to platforms list
              navigate('/platforms')
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [id, navigate])

  // Use permission-based checks for UI controls
  const showManagementActions = canManage && !permissionsLoading

  const handleBack = () => {
    navigate('/platforms')
  }

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handlePlatformUpdated = (updatedPlatform: Platform) => {
    setPlatform(updatedPlatform)
  }

  const handlePlatformDeleted = () => {
    navigate('/platforms')
  }

  const handleScaffold = async (force: boolean = false) => {
    if (!platform || !user?.id) return

    try {
      setScaffolding(true)
      setScaffoldingResult(null)

      const result = await scaffoldPlatformData(platform.id, platform.name, user.id, force)
      setScaffoldingResult(result)

      // Refresh counts if successful
      if (result.success) {
        // The real-time subscriptions should handle the updates automatically
        // but we can trigger a manual refresh if needed
        window.location.reload()
      }
    } catch (err) {
      console.error('Scaffolding error:', err)
      setScaffoldingResult({
        success: false,
        message: 'Failed to scaffold platform data',
        counts: { addressingModes: 0, instructionGroups: 0, vectors: 0 },
        errors: [err instanceof Error ? err.message : String(err)]
      })
    } finally {
      setScaffolding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading platform...</span>
        </div>
      </div>
    )
  }

  if (error || !platform) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Cpu className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Platform Not Found</h3>
          <p className="text-gray-500 mb-6">{error || 'The platform you are looking for does not exist.'}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Platforms
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <Cpu className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{platform.name}</h1>
                  <div className="flex items-center mt-1">
                    {platform.isPublic ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {showManagementActions && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleScaffold(false)}
                  disabled={scaffolding}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {scaffolding ? 'Scaffolding...' : 'Scaffold Data'}
                </button>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Platform Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Sections</h2>
          <p className="text-gray-600">
            Manage different aspects of your platform configuration. Click on any section to view and edit its contents.
          </p>
        </div>

        {/* Scaffolding Result Notification */}
        {scaffoldingResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            scaffoldingResult.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="text-sm font-medium">
                  {scaffoldingResult.success ? 'Scaffolding Successful' : 'Scaffolding Failed'}
                </h3>
                <p className="mt-1 text-sm">{scaffoldingResult.message}</p>
                {scaffoldingResult.success && (
                  <div className="mt-2 text-sm">
                    <p>Created:</p>
                    <ul className="list-disc list-inside ml-2">
                      <li>{scaffoldingResult.counts.addressingModes} addressing modes</li>
                      <li>{scaffoldingResult.counts.instructionGroups} instruction groups</li>
                      <li>{scaffoldingResult.counts.vectors} vectors</li>
                    </ul>
                  </div>
                )}
                {scaffoldingResult.errors && scaffoldingResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Errors:</p>
                    <ul className="list-disc list-inside ml-2 text-sm">
                      {scaffoldingResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setScaffoldingResult(null)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {PLATFORM_SECTIONS.map((section) => {
            const count = counts?.[section.key as keyof typeof counts] || 0
            return (
              <SectionCard
                key={section.key}
                projectId={id || ''}
                sectionName={section.name}
                sectionKey={section.route}
                description={section.description}
                count={count}
                icon={section.icon}
                loading={countsLoading}
                basePath="/platforms"
              />
            )
          })}
        </div>

        {/* Platform Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                {new Date(platform.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                {platform.updatedAt 
                  ? new Date(platform.updatedAt).toLocaleDateString()
                  : 'Never'
                }
              </dd>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {countsLoading ? '...' : (counts.addressingModes || 0)}
                </div>
                <div className="text-xs text-gray-500">Addressing Modes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {countsLoading ? '...' : (counts.instructionSet || 0)}
                </div>
                <div className="text-xs text-gray-500">Instructions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {countsLoading ? '...' : (counts.vectors || 0)}
                </div>
                <div className="text-xs text-gray-500">Vectors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {countsLoading ? '...' : (counts.projects || 0)}
                </div>
                <div className="text-xs text-gray-500">Projects</div>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        {platform.meta && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
              <div className="text-sm text-gray-600">
                <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(platform.meta, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditPlatformModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        platform={platform}
        onPlatformUpdated={handlePlatformUpdated}
      />

      <DeletePlatformModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        platform={platform}
        onPlatformDeleted={handlePlatformDeleted}
      />
    </div>
  )
}
