import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { db } from '../lib/supabase'
import { Users, Plus, Trash2, Search, Mail, UserCheck } from 'lucide-react'
import type { ScribeProject } from '@prisma/client'

interface ProjectUser {
  id: string
  role: string
  userId: string
  projectId: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    avatarUrl: string | null
  }
}

interface User {
  id: string
  name: string | null
  email: string | null
  avatarUrl: string | null
}

interface ContributorManagementProps {
  project: ScribeProject
  isOwner: boolean
}

export default function ContributorManagement({ project, isOwner }: ContributorManagementProps) {
  const { user } = useAuthStore()
  const [contributors, setContributors] = useState<ProjectUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [addingUser, setAddingUser] = useState<string | null>(null)

  // Load contributors
  useEffect(() => {
    loadContributors()
  }, [project.id])

  const loadContributors = async () => {
    try {
      setLoading(true)

      // Check if projectUsers API exists (migration applied)
      if (!db.projectUsers) {
        console.log('ProjectUser table not yet available - migration pending')
        setContributors([])
        setLoading(false)
        return
      }

      const { data, error } = await db.projectUsers.getByProject(project.id)

      if (error) {
        console.error('Error loading contributors:', error)
        // If it's a table doesn't exist error, show a helpful message
        if (error.message?.includes('relation "ProjectUser" does not exist')) {
          setError('Collaboration features are being set up. Please refresh the page in a moment.')
        } else {
          setError('Failed to load contributors')
        }
        return
      }

      setContributors(data || [])
    } catch (err) {
      console.error('Error loading contributors:', err)
      setError('Failed to load contributors')
    } finally {
      setLoading(false)
    }
  }

  // Search users by email
  const searchUsers = async (email: string) => {
    if (!email.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      const { data, error } = await db.users.searchByEmail(email)
      
      if (error) {
        console.error('Error searching users:', error)
        return
      }

      // Filter out users who are already contributors or the project owner
      const existingUserIds = new Set([
        project.createdBy,
        ...contributors.map(c => c.userId)
      ])
      
      const filteredResults = (data || []).filter(u => !existingUserIds.has(u.id))
      setSearchResults(filteredResults)
    } catch (err) {
      console.error('Error searching users:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  // Add contributor
  const addContributor = async (userId: string) => {
    if (!user?.id) return

    try {
      setAddingUser(userId)
      const { data, error } = await db.projectUsers.create(
        {
          projectId: project.id,
          userId: userId,
          role: 'contributor'
        },
        user.id
      )

      if (error) {
        console.error('Error adding contributor:', error)
        return
      }

      if (data) {
        setContributors(prev => [...prev, data])
        setSearchEmail('')
        setSearchResults([])
        setShowAddModal(false)
      }
    } catch (err) {
      console.error('Error adding contributor:', err)
    } finally {
      setAddingUser(null)
    }
  }

  // Remove contributor
  const removeContributor = async (contributorId: string, isCurrentUser: boolean = false) => {
    if (!user?.id) return

    try {
      const { error } = await db.projectUsers.delete(contributorId, user.id)

      if (error) {
        console.error('Error removing contributor:', error)
        return
      }

      setContributors(prev => prev.filter(c => c.id !== contributorId))
      
      // If user removed themselves, they might need to be redirected
      if (isCurrentUser) {
        // Could add navigation logic here if needed
      }
    } catch (err) {
      console.error('Error removing contributor:', err)
    }
  }

  const canRemoveContributor = (contributor: ProjectUser) => {
    return isOwner || contributor.userId === user?.id
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Contributors</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Contributors</h3>
          <span className="ml-2 text-sm text-gray-500">
            ({contributors.length})
          </span>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Contributor
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {contributors.length === 0 ? (
        <div className="text-center py-6">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contributors</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isOwner 
              ? "Add contributors to collaborate on this project."
              : "This project doesn't have any contributors yet."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contributors.map((contributor) => (
            <div
              key={contributor.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {contributor.user.avatarUrl ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={contributor.user.avatarUrl}
                      alt={contributor.user.name || 'User'}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {contributor.user.name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {contributor.user.email}
                  </p>
                </div>
                <div className="ml-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {contributor.role}
                  </span>
                </div>
              </div>
              
              {canRemoveContributor(contributor) && (
                <button
                  onClick={() => removeContributor(contributor.id, contributor.userId === user?.id)}
                  className="text-red-600 hover:text-red-800 p-1 rounded"
                  title={contributor.userId === user?.id ? "Leave project" : "Remove contributor"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Contributor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Contributor</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => {
                      setSearchEmail(e.target.value)
                      searchUsers(e.target.value)
                    }}
                    placeholder="Enter email address..."
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {searchLoading && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {searchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {searchUser.avatarUrl ? (
                            <img
                              className="h-8 w-8 rounded-full"
                              src={searchUser.avatarUrl}
                              alt={searchUser.name || 'User'}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <Mail className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {searchUser.name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {searchUser.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => addContributor(searchUser.id)}
                        disabled={addingUser === searchUser.id}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {addingUser === searchUser.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setSearchEmail('')
                    setSearchResults([])
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
