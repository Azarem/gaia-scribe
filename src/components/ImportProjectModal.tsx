import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import { Search, Download, Calendar, Eye, Tag } from 'lucide-react'
import { db } from '../lib/supabase'
import { createImportOrchestrator, type ImportProgressCallback } from '../lib/import-orchestrator'
import type { ScribeProject } from '@prisma/client'
import type { GameRomBranchData } from '@gaialabs/shared'
import clsx from 'clsx'

interface ImportProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (project: ScribeProject) => void
}

export default function ImportProjectModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportProjectModalProps) {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [gameRomBranches, setGameRomBranches] = useState<GameRomBranchData[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<{
    step: string
    progress: number
    total: number
  } | null>(null)
  const [selectedGameRomBranch, setSelectedGameRomBranch] = useState<GameRomBranchData | null>(null)
  const [customProjectName, setCustomProjectName] = useState('')

  // Search for external GameRomBranches
  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setGameRomBranches([])
      return
    }

    const searchGameRomBranches = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await db.external.searchGameRomBranches(searchQuery)

        if (error) throw error
        setGameRomBranches(data || [])
      } catch (err) {
        console.error('Error searching external GameRomBranches:', err)
        setError('Failed to search GameRomBranches. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchGameRomBranches, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, isOpen])

  // Handle showing the import form for a selected GameRomBranch
  const handleSelectForImport = (gameRomBranch: GameRomBranchData) => {
    setSelectedGameRomBranch(gameRomBranch)
    // Pre-populate with suggested name
    const suggestedName = `${gameRomBranch.gameRom.game.name} - ${gameRomBranch.name || 'Main'} (${gameRomBranch.gameRom.region.name})`
    setCustomProjectName(suggestedName)
    setError(null)
  }

  // Handle GameRomBranch import with comprehensive data transformation
  const handleImport = async () => {
    if (!user?.id || !selectedGameRomBranch || !customProjectName.trim()) return

    setImporting(selectedGameRomBranch.id)
    setError(null)
    setImportProgress(null)

    try {
      // Create import orchestrator and set up progress tracking
      const orchestrator = createImportOrchestrator()

      const onProgress: ImportProgressCallback = (step, progress, total) => {
        setImportProgress({ step, progress, total })
      }

      // Use the user-specified project name
      const projectName = customProjectName.trim()

      // Use the comprehensive import service
      const result = await orchestrator.importExternalGameRomBranch(
        selectedGameRomBranch.id,
        user.id,
        projectName,
        onProgress
      )

      if (!result.success) {
        if (result.validationErrors && result.validationErrors.length > 0) {
          setError(`Validation failed: ${result.validationErrors.join(', ')}`)
        } else if (result.error && result.error.includes('already exists')) {
          setError(`A project with the name "${projectName}" already exists. Please choose a different name.`)
        } else {
          setError(result.error || 'Import failed for unknown reason')
        }
        return
      }

      // Success! Get the created project
      if (result.projectId) {
        const { data: newProject, error: fetchError } = await db.projects.getById(result.projectId)

        if (fetchError || !newProject) {
          console.warn('Could not fetch created project, but import succeeded')
          // Create a minimal project object for the callback
          const minimalProject: ScribeProject = {
            id: result.projectId,
            name: result.projectName || 'Imported Project',
            isPublic: false,
            meta: null,
            gameRomId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            createdBy: user.id,
            updatedBy: user.id,
            deletedBy: null
          }
          onImportComplete?.(minimalProject)
        } else {
          onImportComplete?.(newProject)
        }
      }

      // Reset form and close modal on success
      setSelectedGameRomBranch(null)
      setCustomProjectName('')
      onClose()
    } catch (err) {
      console.error('Error importing project:', err)
      setError('Failed to import project. Please try again.')
    } finally {
      setImporting(null)
      setImportProgress(null)
    }
  }

  const handleReset = () => {
    setSearchQuery('')
    setGameRomBranches([])
    setError(null)
    setSelectedGameRomBranch(null)
    setCustomProjectName('')
  }

  const handleBackToList = () => {
    setSelectedGameRomBranch(null)
    setCustomProjectName('')
    setError(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedGameRomBranch ? "Import Project" : "Import Public Project"}
      className="max-w-2xl"
    >
      <div className="p-6">
        {selectedGameRomBranch ? (
          /* Import Form View */
          <div>
            {/* Back Button */}
            <button
              onClick={handleBackToList}
              className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              ← Back to search results
            </button>

            {/* Selected GameRomBranch Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedGameRomBranch.gameRom.game.name}
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Platform: {selectedGameRomBranch.platformBranch.platform.name}</div>
                <div>Region: {selectedGameRomBranch.gameRom.region.name}</div>
                <div>CRC: {selectedGameRomBranch.gameRom.crc}</div>
                {selectedGameRomBranch.name && <div>Branch: {selectedGameRomBranch.name}</div>}
              </div>
            </div>

            {/* Project Name Input */}
            <div className="mb-6">
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                value={customProjectName}
                onChange={(e) => setCustomProjectName(e.target.value)}
                placeholder="Enter a name for your project..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Choose a unique name for your imported project
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Import Progress */}
            {importing && importProgress && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-700 mb-2">{importProgress.step}</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-blue-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.progress / importProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-blue-600">
                    {importProgress.progress}/{importProgress.total}
                  </span>
                </div>
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
                disabled={!!importing || !customProjectName.trim()}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                  importing || !customProjectName.trim()
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
                  'Import Project'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Search and List View */
          <div>
            {/* Search Bar */}
            <div className="mb-6">
              <label htmlFor="project-search" className="block text-sm font-medium text-gray-700 mb-2">
                Search public projects
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="project-search"
                  type="text"
                  placeholder="Enter project name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Searching projects...</span>
          </div>
        )}

        {/* No Search Query */}
        {!searchQuery.trim() && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Enter a game name to search for GameROM branches</p>
          </div>
        )}

        {/* No Results */}
        {searchQuery.trim() && !loading && gameRomBranches.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No GameROM branches found matching "{searchQuery}"</p>
            <button
              onClick={handleReset}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear search
            </button>
          </div>
        )}

        {/* GameRomBranch Results */}
        {gameRomBranches.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {gameRomBranches.map((gameRomBranch) => (
              <div
                key={gameRomBranch.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {gameRomBranch.gameRom.game.name}
                      </h3>
                      {gameRomBranch.name && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {gameRomBranch.name}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        v{gameRomBranch.version || 1}
                      </span>
                      {gameRomBranch.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(gameRomBranch.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 mr-1" />
                        <span>{gameRomBranch.gameRom.region.name}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      Platform: {gameRomBranch.platformBranch.platform.name}
                    </div>

                    <div className="mt-1 text-sm text-blue-600">
                      CRC: {gameRomBranch.gameRom.crc}
                    </div>

                    {gameRomBranch.notes && gameRomBranch.notes.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Latest notes:</span>
                        <div className="mt-1 text-xs">
                          {gameRomBranch.notes.slice(0, 3).map((note, index) => (
                            <div key={index} className="truncate">• {note}</div>
                          ))}
                          {gameRomBranch.notes.length > 3 && (
                            <div className="text-gray-400">+{gameRomBranch.notes.length - 3} more...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                    <div className="ml-4 flex flex-col items-end">
                      <button
                        onClick={() => handleSelectForImport(gameRomBranch)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Select
                      </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Imported projects will be private by default
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
