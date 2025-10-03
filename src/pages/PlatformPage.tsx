import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { signOut, supabase, db } from '../lib/supabase'
import { logger } from '../lib/logger'
import { LogOut, User, Plus, Download, Calendar, Users as UsersIcon, Cpu } from 'lucide-react'
import type { Platform } from '@prisma/client'
import CreatePlatformModal from '../components/CreatePlatformModal'
import ImportPlatformModal from '../components/ImportPlatformModal'
import UserSyncStatus from '../components/UserSyncStatus'
import ConnectionStatus from '../components/ConnectionStatus'
import PublicPlatformsSection from '../components/PublicPlatformsSection'

type PlatformWithCreator = Platform

export default function PlatformPage() {
  const navigate = useNavigate()
  const { user, session, loading: authLoading, initialized, isAnonymousMode } = useAuthStore()
  const [platforms, setPlatforms] = useState<PlatformWithCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePlatform, setShowCreatePlatform] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (initialized && !authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, initialized, navigate])

  // Load platforms when user is available
  useEffect(() => {
    if (!user || !session || !initialized || authLoading) {
      return
    }

    logger.platform.loading('Setting up platform loading and realtime subscription', { userId: user.id })
    let isCancelled = false

    const loadPlatforms = async () => {
      try {
        logger.platform.loading('Calling db.platforms.getByUser', { userId: user.id })

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 5 seconds')), 5000)
        )

        const requestPromise = db.platforms.getByUser(user.id)

        const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any
        logger.platform.loading('db.platforms.getByUser completed', { dataLength: data?.length, error })

        if (error) {
          logger.platform.error('loading platforms', error)
          return
        }
        if (!isCancelled) {
          logger.platform.loading('Setting platforms', { count: data?.length || 0 })
          setPlatforms(data || [])
        }
      } catch (error) {
        logger.platform.error('loading platforms', error)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadPlatforms()

    // Skip realtime subscriptions in anonymous mode
    if (isAnonymousMode) {
      logger.platform.realtime('Skipping platform realtime subscriptions in anonymous mode')
      return
    }

    // Set up realtime subscription for platform changes
    const setupRealtimeSubscription = async () => {
      try {
        logger.platform.realtime('Setting up subscription for platforms')

        const channel = supabase
          .channel(`user-platforms-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'Platform'
            },
            (payload) => {
              const newPlatform = payload.new as Platform
              // Only add if it belongs to the current user
              if (newPlatform.createdBy === user.id && !isCancelled) {
                setPlatforms(prev => [newPlatform as PlatformWithCreator, ...prev])
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'Platform'
            },
            (payload) => {
              const updatedPlatform = payload.new as Platform
              if (!isCancelled) {
                setPlatforms(prev =>
                  prev.map(p => p.id === updatedPlatform.id ? { ...p, ...updatedPlatform } : p)
                )
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'Platform'
            },
            (payload) => {
              const deletedPlatform = payload.old as Platform
              if (!isCancelled) {
                setPlatforms(prev => prev.filter(p => p.id !== deletedPlatform.id))
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              logger.platform.realtime('Subscription active')
            } else if (status === 'CHANNEL_ERROR') {
              logger.platform.error('realtime subscription', err)
            } else if (status === 'CLOSED') {
              logger.platform.realtime('Subscription closed')
            }
          })

        return channel
      } catch (error) {
        logger.platform.error('setting up realtime subscription', error)
        return null
      }
    }

    let channelRef: any = null

    setupRealtimeSubscription().then(channel => {
      if (channel && !isCancelled) {
        channelRef = channel
      }
    })

    return () => {
      isCancelled = true
      if (channelRef) {
        supabase.removeChannel(channelRef)
      }
    }
    }, [user, session, initialized, authLoading, isAnonymousMode])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleImportComplete = (newPlatform: Platform) => {
    // Add the imported platform to the list
    setPlatforms(prev => [newPlatform as PlatformWithCreator, ...prev])
  }

  const handlePlatformCreated = (newPlatform: Platform) => {
    // Add the created platform to the list
    setPlatforms(prev => [newPlatform as PlatformWithCreator, ...prev])
  }

  const handlePlatformClick = (platformId: string) => {
    navigate(`/platforms/${platformId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Scribe Platforms</h1>
              <span className="ml-3 text-sm text-gray-500">Platform Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Projects
              </button>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">
                  {user?.email || user?.user_metadata?.full_name || 'User'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User Sync Status */}
      <UserSyncStatus />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

        <div className="px-4 py-6 sm:px-0">
          {/* Public Platforms Section */}
          <PublicPlatformsSection className="mb-12" />

          {/* My Platforms Section Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Platforms</h2>
            <p className="text-gray-600">
              Create and manage your platform configurations
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mb-8 flex space-x-4">
            <button
              onClick={() => setShowCreatePlatform(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Import
            </button>
          </div>

          {/* Platforms List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading your platforms...</span>
            </div>
          ) : platforms.length === 0 ? (
            <div className="text-center py-12">
              <Cpu className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No platforms yet</h3>
              <p className="text-gray-500 mb-6">
                Get started by creating a new platform or importing an existing one.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowCreatePlatform(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform.id)}
                  className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Cpu className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {platform.name}
                        </h3>
                        <div className="flex items-center mt-1">
                          {platform.isPublic ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              Private
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          {platform.updatedAt 
                            ? new Date(platform.updatedAt).toLocaleDateString()
                            : new Date(platform.createdAt).toLocaleDateString()
                          }
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          <span>You</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlatformClick(platform.id)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Open →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreatePlatformModal
        isOpen={showCreatePlatform}
        onClose={() => setShowCreatePlatform(false)}
        onPlatformCreated={handlePlatformCreated}
      />

      <ImportPlatformModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
