/**
 * Platform Selector Component
 *
 * Enforces strict platform selection based on platformBranchId relationships.
 * Only allows selection of the platform that matches the required platformBranchId.
 */

import { useState, useEffect } from 'react'
import { Cpu, AlertTriangle, Check } from 'lucide-react'
import type { Platform } from '@prisma/client'
import { getAvailablePlatforms, findPlatformByBranchId } from '../lib/platform-matcher'
import { useAuthStore } from '../stores/auth-store'
import { logger } from '../lib/logger'

interface PlatformSelectorProps {
  selectedPlatformId?: string
  onPlatformSelect: (platformId: string) => void
  requiredPlatformBranchId?: string
  disabled?: boolean
  className?: string
}

export default function PlatformSelector({
  selectedPlatformId,
  onPlatformSelect,
  requiredPlatformBranchId,
  disabled = false,
  className = ''
}: PlatformSelectorProps) {
  const { user } = useAuthStore()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiredPlatform, setRequiredPlatform] = useState<Platform | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const loadPlatforms = async () => {
      try {
        setLoading(true)
        setError(null)
        setRequiredPlatform(null)

        if (requiredPlatformBranchId) {
          // Strict mode: find the specific platform required
          const result = await findPlatformByBranchId(requiredPlatformBranchId)

          if (result.success && result.platform) {
            setRequiredPlatform(result.platform)
            setPlatforms([result.platform])

            // Auto-select the required platform
            if (!selectedPlatformId) {
              logger.platform.loading('Auto-selected required platform', {
                platformId: result.platform.id,
                platformName: result.platform.name,
                platformBranchId: requiredPlatformBranchId
              })
              onPlatformSelect(result.platform.id)
            }
          } else {
            setError(result.error || 'Required platform not found')
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

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Platform *
      </label>

      {requiredPlatformBranchId && requiredPlatform && (
        <div className="text-xs text-blue-600 mb-2 p-2 bg-blue-50 rounded">
          <strong>Required Platform:</strong> {requiredPlatform.name}
          <br />
          <span className="text-xs text-gray-500">Platform Branch ID: {requiredPlatformBranchId}</span>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
        {platforms.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No platforms available
          </div>
        ) : (
          platforms.map((platform) => {
            const isSelected = selectedPlatformId === platform.id
            const isRequired = requiredPlatformBranchId && platform.platformBranchId === requiredPlatformBranchId
            const isDisabledOption = requiredPlatformBranchId && !isRequired

            return (
              <div
                key={platform.id}
                onClick={() => !disabled && !isDisabledOption && onPlatformSelect(platform.id)}
                className={`
                  relative flex items-center p-3 rounded-md transition-colors
                  ${disabled || isDisabledOption ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                  ${isSelected ? 'bg-blue-50 border-blue-200 border' : 'border border-gray-200'}
                  ${isRequired ? 'ring-2 ring-blue-300' : ''}
                `}
              >
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <Cpu className="h-5 w-5 text-blue-600" />
                </div>

                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium text-gray-900">
                      {platform.name}
                    </h4>
                    {isRequired && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Required
                      </span>
                    )}
                    {platform.isPublic && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Public
                      </span>
                    )}
                  </div>

                  {platform.platformBranchId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Platform Branch: {platform.platformBranchId}
                    </p>
                  )}
                </div>

                {isSelected && (
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {!selectedPlatformId && platforms.length > 0 && !requiredPlatformBranchId && (
        <p className="text-xs text-red-600">
          Please select a platform to continue
        </p>
      )}

      {requiredPlatformBranchId && platforms.length === 0 && (
        <p className="text-xs text-red-600">
          The required platform must be imported before this GameROM can be imported.
        </p>
      )}
    </div>
  )
}
