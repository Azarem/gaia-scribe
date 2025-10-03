import { useState } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import { Search, Download, Cpu } from 'lucide-react'
import { db } from '../lib/supabase'
import { createPlatformImportOrchestrator, type PlatformImportProgressCallback } from '../lib/platform-import-orchestrator'
import type { Platform } from '@prisma/client'
import clsx from 'clsx'
import { PlatformBranchData } from '@gaialabs/shared'

// interface PlatformBranchData {
//   id: string
//   name: string
//   version: string
//   platformId: string
//   addressingModes: any
//   instructionSet: any
//   vectors: any
//   platform: {
//     id: string
//     name: string
//     meta: any
//   }
//   createdAt: string
//   updatedAt: string
// }

interface ImportPlatformModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (platform: Platform) => void
}

export default function ImportPlatformModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportPlatformModalProps) {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [platformBranches, setPlatformBranches] = useState<PlatformBranchData[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<{
    step: string
    progress: number
    total: number
  } | null>(null)
  const [selectedPlatformBranch, setSelectedPlatformBranch] = useState<PlatformBranchData | null>(null)
  const [customPlatformName, setCustomPlatformName] = useState('')

  // Search for platform branches
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: searchError } = await db.external.searchPlatformBranches(searchQuery)

      if (searchError) {
        setError('Failed to search platforms. Please try again.')
        return
      }

      setPlatformBranches(data ?? [])
      
      if (!data || data.length === 0) {
        setError('No platforms found matching your search.')
      }
    } catch (err) {
      console.error('Error searching platforms:', err)
      if (err instanceof Error && err.message.includes('network')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('Failed to search platforms. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle showing the import form for a selected PlatformBranch
  const handleSelectForImport = (platformBranch: PlatformBranchData) => {
    setSelectedPlatformBranch(platformBranch)
    // Pre-populate with suggested name
    const suggestedName = `${platformBranch.platform.name} - ${platformBranch.name || 'Main'}`
    setCustomPlatformName(suggestedName)
    setError(null)
  }

  // Handle PlatformBranch import with comprehensive data transformation
  const handleImport = async () => {
    if (!user?.id || !selectedPlatformBranch || !customPlatformName.trim()) return

    setImporting(selectedPlatformBranch.id)
    setError(null)
    setImportProgress(null)

    try {
      // Create import orchestrator and set up progress tracking
      const orchestrator = createPlatformImportOrchestrator()

      const onProgress: PlatformImportProgressCallback = (step, progress, total) => {
        setImportProgress({ step, progress, total })
      }

      // Use the user-specified platform name
      const platformName = customPlatformName.trim()

      // Use the comprehensive import service
      const result = await orchestrator.importExternalPlatformBranch(
        selectedPlatformBranch.id,
        user.id,
        platformName,
        onProgress
      )

      if (!result.success) {
        throw new Error(result.error || 'Import failed')
      }

      // Success! Get the created platform
      if (result.platformId) {
        const { data: newPlatform, error: fetchError } = await db.platforms.getById(result.platformId)
        if (fetchError) throw fetchError;
        onImportComplete?.(newPlatform);
      }

      // Reset form and close modal on success
      setSelectedPlatformBranch(null)
      setCustomPlatformName('')
      onClose()
    } catch (err) {
      console.error('Error importing platform:', err)
      setError('Failed to import platform. Please try again.')
    } finally {
      setImporting(null)
      setImportProgress(null)
    }
  }

  const handleReset = () => {
    setSearchQuery('')
    setPlatformBranches([])
    setError(null)
    setSelectedPlatformBranch(null)
    setCustomPlatformName('')
  }

  const handleBackToList = () => {
    setSelectedPlatformBranch(null)
    setCustomPlatformName('')
    setError(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedPlatformBranch ? "Import Platform" : "Import Public Platform"}
      className="max-w-2xl"
    >
      <div className="p-6">
        {selectedPlatformBranch ? (
          /* Import Form View */
          <div>
            {/* Back Button */}
            <button
              onClick={handleBackToList}
              className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              ← Back to search results
            </button>

            {/* Selected Platform Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Cpu className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedPlatformBranch.platform.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Branch: {selectedPlatformBranch.name} (v{selectedPlatformBranch.version})
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Name Input */}
            <div className="mb-6">
              <label htmlFor="platform-name" className="block text-sm font-medium text-gray-700 mb-2">
                Platform Name
              </label>
              <input
                id="platform-name"
                type="text"
                value={customPlatformName}
                onChange={(e) => setCustomPlatformName(e.target.value)}
                placeholder="Enter a name for your platform..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Choose a unique name for your imported platform
              </p>
            </div>

            {/* Import Progress */}
            {importProgress && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-700 mb-2">{importProgress.step}</div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.progress / importProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Step {importProgress.progress} of {importProgress.total}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleBackToList}
                disabled={!!importing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!!importing || !customPlatformName.trim()}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                  importing || !customPlatformName.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2 inline-block" />
                    Import Platform
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Search View */
          <div>
            {/* Search Input */}
            <div className="mb-6">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Platforms
              </label>
              <div className="flex space-x-3">
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by platform name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !searchQuery.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Search Results */}
            {platformBranches.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {platformBranches.map((platformBranch) => (
                  <div
                    key={platformBranch.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectForImport(platformBranch)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Cpu className="h-6 w-6 text-blue-600 mr-3" />
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {platformBranch.platform.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Branch: {platformBranch.name} (v{platformBranch.version})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          Updated {new Date(platformBranch.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reset Button */}
            {(platformBranches.length > 0 || error) && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear and search again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
