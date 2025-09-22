import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { signOut, supabase, db } from '../lib/supabase'
import { LogOut, User, Plus, Download, Calendar, Eye, Users as UsersIcon } from 'lucide-react'
import type { ScribeProject } from '@prisma/client'
import ComingSoonModal from '../components/ComingSoonModal'
import ImportProjectModal from '../components/ImportProjectModal'
import UserSyncStatus from '../components/UserSyncStatus'
import ConnectionStatus from '../components/ConnectionStatus'
import PublicProjectsSection from '../components/PublicProjectsSection'

import clsx from 'clsx'

type ProjectWithCreator = ScribeProject

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, session, loading: authLoading, initialized } = useAuthStore()
  const [projects, setProjects] = useState<ProjectWithCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Load user's projects
  useEffect(() => {
    console.log('Dashboard useEffect triggered:', {
      initialized,
      authLoading,
      hasUser: !!user,
      userId: user?.id,
      hasSession: !!session,
      sessionUser: session?.user?.id
    })

    // Don't load anything until auth is initialized
    if (!initialized || authLoading) {
      console.log('Auth not ready, skipping project load')
      return
    }

    // If no user after auth is initialized, clear projects and stop loading
    if (!user?.id || !session) {
      console.log('No user or session, clearing projects:', { userId: user?.id, hasSession: !!session })
      setLoading(false)
      setProjects([])
      return
    }

    console.log('Starting project load for user:', user.id)

    let isCancelled = false

    const loadProjects = async () => {
      try {
        console.log('About to call db.projects.getByUser with userId:', user.id)

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 5 seconds')), 5000)
        )

        const requestPromise = db.projects.getByUser(user.id)

        const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any
        console.log('db.projects.getByUser completed:', { data: data?.length, error })

        if (error) {
          console.error('Error loading projects:', error)
          return
        }
        if (!isCancelled) {
          console.log('Setting projects:', data?.length || 0)
          setProjects(data || [])
        }
      } catch (error) {
        console.error('Exception in loadProjects:', error)
      } finally {
        if (!isCancelled) {
          console.log('Setting loading to false')
          setLoading(false)
        }
      }
    }

    loadProjects()

    // Set up realtime subscriptions for project changes
    const setupRealtimeSubscription = async () => {
      try {
        // Ensure auth is set for realtime
        await supabase.realtime.setAuth(session?.access_token)

        const channel = supabase
          .channel(`user-projects-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ScribeProject'
            },
            (payload) => {
              const newProject = payload.new as ScribeProject
              // Only add if it belongs to the current user
              if (newProject.createdBy === user.id && !isCancelled) {
                setProjects(prev => [newProject as ProjectWithCreator, ...prev])
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'ScribeProject'
            },
            (payload) => {
              const updatedProject = payload.new as ScribeProject
              if (!isCancelled) {
                setProjects(prev =>
                  prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
                )
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'ScribeProject'
            },
            (payload) => {
              const deletedProject = payload.old as ScribeProject
              if (!isCancelled) {
                setProjects(prev => prev.filter(p => p.id !== deletedProject.id))
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('Realtime subscription active')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Realtime subscription error:', err)
            } else if (status === 'CLOSED') {
              console.log('Realtime subscription closed')
            }
          })

        return channel
      } catch (error) {
        console.error('Error setting up realtime subscription:', error)
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
    }, [user, session, initialized, authLoading])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleImportComplete = (newProject: ScribeProject) => {
    // Add the imported project to the list
    setProjects(prev => [newProject as ProjectWithCreator, ...prev])
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Scribe</h1>
              <span className="ml-3 text-sm text-gray-500">Game Database Editor</span>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
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
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* User Sync Status */}
        <UserSyncStatus />

        <div className="px-4 py-6 sm:px-0">
          {/* Public Projects Section */}
          <PublicProjectsSection className="mb-12" />

          {/* My Projects Section Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Projects</h2>
            <p className="text-gray-600">
              Create and manage your game database projects
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mb-8 flex space-x-4">
            <button
              onClick={() => setShowComingSoon(true)}
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

          {/* Projects List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading your projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">
                Get started by creating a new project or importing an existing one.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowComingSoon(true)}
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
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {project.name}
                    </h3>
                    <div className={clsx(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      project.isPublic 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    )}>
                      {project.isPublic ? 'Public' : 'Private'}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Never'}</span>
                    </div>
                    
                    {project.gameRomId && (
                      <div className="flex items-center text-blue-600">
                        <span className="w-4 h-4 mr-2 flex items-center justify-center">
                          🎮
                        </span>
                        <span>ROM ID: {project.gameRomId}</span>
                      </div>
                    )}

                    {project.meta && (project.meta as any)?.importedFrom && (
                      <div className="flex items-center text-purple-600">
                        <Download className="h-4 w-4 mr-2" />
                        <span>Imported project</span>
                      </div>
                    )}
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
                          handleProjectClick(project.id)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Open →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        feature="Create New Project"
      />

      <ImportProjectModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}

