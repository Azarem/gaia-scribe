import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import { Cpu, Calendar, Globe, ChevronRight } from 'lucide-react'
import type { Platform } from '@prisma/client'
import clsx from 'clsx'

interface PublicPlatformsSectionProps {
  className?: string
}

export default function PublicPlatformsSection({ className }: PublicPlatformsSectionProps) {
  const navigate = useNavigate()
  const [publicPlatforms, setPublicPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPublicPlatforms = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await db.platforms.getPublicRecent(6)

        if (fetchError) {
          setError('Failed to load public platforms')
          return
        }

        setPublicPlatforms(data || [])
      } catch (err) {
        console.error('Error loading public platforms:', err)
        setError('Failed to load public platforms')
      } finally {
        setLoading(false)
      }
    }

    loadPublicPlatforms()
  }, [])

  const handlePlatformClick = (platformId: string) => {
    navigate(`/platforms/${platformId}`)
  }

  if (loading) {
    return (
      <div className={clsx('bg-white shadow rounded-lg p-6', className)}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Public Platforms</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading public platforms...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={clsx('bg-white shadow rounded-lg p-6', className)}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Public Platforms</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (publicPlatforms.length === 0) {
    return (
      <div className={clsx('bg-white shadow rounded-lg p-6', className)}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Public Platforms</h2>
        <div className="text-center py-8">
          <Cpu className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No public platforms available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('bg-white shadow rounded-lg p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Public Platforms</h2>
        <button
          onClick={() => navigate('/platforms/public')}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
        >
          View all
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {publicPlatforms.map((platform) => (
          <div
            key={platform.id}
            onClick={() => handlePlatformClick(platform.id)}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
          >
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <Cpu className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {platform.name}
                </h3>
                <div className="flex items-center mt-1">
                  <Globe className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">Public</span>
                </div>
              </div>
            </div>

            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="h-3 w-3 mr-1" />
              <span>
                {platform.updatedAt 
                  ? new Date(platform.updatedAt).toLocaleDateString()
                  : new Date(platform.createdAt).toLocaleDateString()
                }
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Discover and use platforms created by the community
        </p>
      </div>
    </div>
  )
}
