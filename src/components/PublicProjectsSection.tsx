import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase'
import { Calendar, Download, Users as UsersIcon, Eye, TrendingUp, Clock, Star } from 'lucide-react'
import type { ScribeProject } from '@prisma/client'
import clsx from 'clsx'

type DiscoveryFilter = 'recent' | 'updated' | 'active' | 'popular'

interface PublicProjectsSectionProps {
  className?: string
}

export default function PublicProjectsSection({ className }: PublicProjectsSectionProps) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ScribeProject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilter>('recent')

  const filters = [
    {
      key: 'recent' as const,
      label: 'Recently Created',
      icon: Clock,
      description: 'New public projects'
    },
    {
      key: 'updated' as const,
      label: 'Recently Updated',
      icon: TrendingUp,
      description: 'Projects with recent activity'
    },
    {
      key: 'active' as const,
      label: 'Most Active',
      icon: Eye,
      description: 'Frequently updated projects'
    },
    {
      key: 'popular' as const,
      label: 'Popular',
      icon: Star,
      description: 'Trending projects'
    }
  ]

  const loadProjects = async (filter: DiscoveryFilter) => {
    setLoading(true)
    try {
      let result
      switch (filter) {
        case 'recent':
          result = await db.projects.getPublicRecent(12)
          break
        case 'updated':
          result = await db.projects.getPublicRecentlyUpdated(12)
          break
        case 'active':
          result = await db.projects.getPublicMostActive(12)
          break
        case 'popular':
          result = await db.projects.getPublicPopular(12)
          break
        default:
          result = await db.projects.getPublicRecent(12)
      }

      if (result.error) {
        console.error('Error loading public projects:', result.error)
        setProjects([])
      } else {
        setProjects(result.data || [])
      }
    } catch (error) {
      console.error('Exception loading public projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects(activeFilter)
  }, [activeFilter])

  const handleFilterChange = (filter: DiscoveryFilter) => {
    setActiveFilter(filter)
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`)
  }

  return (
    <div className={className}>
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Public Projects</h2>
        <p className="text-gray-600">
          Discover projects shared by the community
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {filters.map((filter) => {
              const Icon = filter.icon
              const isActive = activeFilter === filter.key
              return (
                <button
                  key={filter.key}
                  onClick={() => handleFilterChange(filter.key)}
                  className={clsx(
                    'group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm',
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className={clsx(
                    'mr-2 h-4 w-4',
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  )} />
                  {filter.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-5 bg-gray-200 rounded-full w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No public projects found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeFilter === 'recent' && 'No new public projects have been created recently.'}
            {activeFilter === 'updated' && 'No public projects have been updated recently.'}
            {activeFilter === 'active' && 'No public projects have been active in the last 30 days.'}
            {activeFilter === 'popular' && 'No popular public projects found in the last 90 days.'}
          </p>
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
                <div className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Public
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {activeFilter === 'recent' 
                      ? `Created ${new Date(project.createdAt).toLocaleDateString()}`
                      : `Updated ${project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Never'}`
                    }
                  </span>
                </div>
                
                {project.gameRomBranchId && (
                  <div className="flex items-center text-blue-600">
                    <span className="w-4 h-4 mr-2 flex items-center justify-center">
                      🎮
                    </span>
                    <span>ROM BRANCH ID: {project.gameRomBranchId}</span>
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
                    <span>Community</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectClick(project.id)
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
