/**
 * Enhanced Platform Selector Component with Collapsible Interface
 *
 * Provides a collapsible card interface for selecting from multiple platforms
 * that match a given platformBranchId, with auto-selection of the most recent platform.
 */

import { useState, useEffect } from 'react'
import { Cpu, AlertTriangle, Check, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import type { Platform } from '@prisma/client'
import { findAllPlatformsByBranchId, getAvailablePlatforms } from '../lib/platform-matcher'
import { useAuthStore } from '../stores/auth-store'
import { logger } from '../lib/logger'
import clsx from 'clsx'

interface EnhancedPlatformSelectorProps {
  selectedPlatformId?: string
  onPlatformSelect: (platformId: string) => void
  requiredPlatformBranchId?: string
  disabled?: boolean
  className?: string
}

export default function EnhancedPlatformSelector({
  selectedPlatformId,
  onPlatformSelect,
  requiredPlatformBranchId,
  disabled = false,
  className = ''
}: EnhancedPlatformSelectorProps) {
  const { user } = useAuthStore()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const loadPlatforms = async () => {
      try {
        setLoading(true)
        setError(null)

        if (requiredPlatformBranchId) {
          // Enhanced mode: find all platforms that match the platformBranchId
          const result = await findAllPlatformsByBranchId(requiredPlatformBranchId)

          if (result.success && result.platforms.length > 0) {
            setPlatforms(result.platforms)

            // Auto-select the most recent platform (first in sorted array)
            const mostRecentPlatform = result.platforms[0]
            setSelectedPlatform(mostRecentPlatform)

            if (!selectedPlatformId) {
              logger.platform.loading('Auto-selected most recent platform', {
                platformId: mostRecentPlatform.id,
                platformName: mostRecentPlatform.name,
                platformBranchId: requiredPlatformBranchId,
                totalOptions: result.platforms.length
              })
              onPlatformSelect(mostRecentPlatform.id)
            }
          } else {
            setError(result.error || 'No platforms found for the required platform branch')
            setPlatforms([])
          }
        } else {
          // Flexible mode: load all available platforms
          const { data, error: loadError } = await getAvailablePlatforms(user.id)

          if (loadError) {
            setError('Failed to load platforms')
            logger.platform.error('loading platforms for selector', loadError)
            return
          }

          setPlatforms(data)
        }

      } catch (err) {
        setError('Failed to load platforms')
        logger.platform.error('loading platforms for selector', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlatforms()
  }, [user?.id, requiredPlatformBranchId, selectedPlatformId, onPlatformSelect])

  // Update selected platform when selectedPlatformId changes
  useEffect(() => {
    if (selectedPlatformId && platforms.length > 0) {
      const platform = platforms.find(p => p.id === selectedPlatformId)
      if (platform) {
        setSelectedPlatform(platform)
      }
    }
  }, [selectedPlatformId, platforms])

  const handlePlatformSelect = (platform: Platform) => {
    if (disabled) return
    
    setSelectedPlatform(platform)
    onPlatformSelect(platform.id)
    setIsExpanded(false) // Collapse after selection
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          Platform *
        </label>
        <div className="flex items-center justify-center p-4 border border-gray-300 rounded-md">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">Loading platforms...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          Platform *
        </label>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Platform Required</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {requiredPlatformBranchId && (
                <p className="text-xs text-red-600 mt-2">
                  Platform Branch ID: {requiredPlatformBranchId}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (platforms.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          Platform *
        </label>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">No Platforms Available</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {requiredPlatformBranchId 
                  ? 'The required platform must be imported before this project can be imported.'
                  : 'No platforms are available for selection.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Platform *
        {platforms.length > 1 && (
          <span className="text-xs text-gray-500 ml-1">
            ({platforms.length} options available)
          </span>
        )}
      </label>

      {/* Collapsed Card - Shows Selected Platform */}
      {selectedPlatform && (
        <div
          onClick={() => platforms.length > 1 && !disabled && setIsExpanded(!isExpanded)}
          className={clsx(
            'border border-gray-300 rounded-md p-4 transition-colors',
            platforms.length > 1 && !disabled && 'cursor-pointer hover:bg-gray-50',
            disabled && 'opacity-50 cursor-not-allowed',
            selectedPlatformId === selectedPlatform.id && 'bg-blue-50 border-blue-200'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                <Cpu className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">
                  {selectedPlatform.name}
                </h4>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>
                    {selectedPlatform.updatedAt 
                      ? `Updated ${formatDate(selectedPlatform.updatedAt)}`
                      : `Created ${formatDate(selectedPlatform.createdAt)}`
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Check className="h-5 w-5 text-blue-600 mr-2" />
              {platforms.length > 1 && !disabled && (
                isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded List - Shows All Platform Options */}
      {isExpanded && platforms.length > 1 && (
        <div className="border border-gray-300 rounded-md bg-white shadow-sm">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Select Platform ({platforms.length} options)
            </h5>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {platforms.map((platform) => {
              const isSelected = selectedPlatformId === platform.id
              
              return (
                <div
                  key={platform.id}
                  onClick={() => handlePlatformSelect(platform)}
                  className={clsx(
                    'flex items-center p-3 transition-colors cursor-pointer hover:bg-gray-50',
                    isSelected && 'bg-blue-50',
                    'border-b border-gray-100 last:border-b-0'
                  )}
                >
                  <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                    <Cpu className="h-4 w-4 text-blue-600" />
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {platform.name}
                      </h4>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>
                        {platform.updatedAt 
                          ? `Updated ${formatDate(platform.updatedAt)}`
                          : `Created ${formatDate(platform.createdAt)}`
                        }
                      </span>
                      {platform.isPublic && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!selectedPlatformId && platforms.length > 0 && !requiredPlatformBranchId && (
        <p className="text-xs text-red-600">
          Please select a platform to continue
        </p>
      )}
    </div>
  )
}
