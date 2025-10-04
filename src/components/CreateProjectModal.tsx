import { useState, useCallback } from 'react'
import { useAuthStore } from '../stores/auth-store'
import Modal from './Modal'
import FileUpload from './FileUpload'
import PlatformSelector from './PlatformSelector'
import { db } from '../services/supabase'
import { parseRomHeader, generateProjectName, validateRomFile, type RomHeaderInfo } from '../lib/rom-parser'
import { Plus, CheckCircle, AlertCircle, Gamepad2 } from 'lucide-react'
import type { ScribeProject } from '@prisma/client'
import clsx from 'clsx'
import { createId } from '@paralleldrive/cuid2'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated?: (project: ScribeProject) => void
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) {
  const { user } = useAuthStore()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [romHeader, setRomHeader] = useState<RomHeaderInfo | null>(null)
  const [projectName, setProjectName] = useState('')
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setFileError(null)
    setError(null)
    setIsAnalyzing(true)

    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Parse the ROM header
      const header = parseRomHeader(arrayBuffer)
      
      // Mark as valid if we found a reasonable header
      header.isValid = header.title.trim().length > 0 && header.headerLocation >= 0
      
      setRomHeader(header)
      
      // Generate project name
      const generatedName = generateProjectName(header)
      setProjectName(generatedName)
      
    } catch (err) {
      console.error('Error analyzing ROM file:', err)
      setError('Failed to analyze ROM file. Please ensure it is a valid SNES ROM.')
      setRomHeader(null)
      setProjectName('')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null)
    setRomHeader(null)
    setProjectName('')
    setSelectedPlatformId('')
    setFileError(null)
    setError(null)
  }, [])

  const handleCreateProject = useCallback(async () => {
    if (!user?.id || !projectName.trim() || !selectedPlatformId) return

    setIsCreating(true)
    setError(null)

    try {
      // Prepare project metadata
      const projectMeta = romHeader ? {
        romInfo: {
          title: romHeader.title,
          mapMode: romHeader.mapMode,
          romSpeed: romHeader.romSpeed,
          chipset: romHeader.chipset,
          romSize: romHeader.romSize,
          ramSize: romHeader.ramSize,
          region: romHeader.region,
          developerId: romHeader.developerId,
          version: romHeader.version,
          checksum: romHeader.checksum,
          checksumComplement: romHeader.checksumComplement,
          headerLocation: romHeader.headerLocation,
          fileName: selectedFile?.name || 'unknown.rom'
        }
      } : null

      // Create the project
      const { data: newProject, error: createError } = await db.projects.create(
        {
          id: createId(),
          gameRomBranchId: null,
          name: projectName.trim(),
          isPublic: false, // Always private by default
          platformId: selectedPlatformId,
          meta: projectMeta
        },
        user.id
      )

      if (createError || !newProject) {
        throw new Error(createError?.message || 'Failed to create project')
      }

      // Success!
      onProjectCreated?.(newProject)
      onClose()
      
      // Reset form
      handleFileRemove()
      
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }, [user?.id, projectName, selectedPlatformId, romHeader, selectedFile, onProjectCreated, onClose, handleFileRemove])

  const handleClose = useCallback(() => {
    if (!isCreating && !isAnalyzing) {
      handleFileRemove()
      onClose()
    }
  }, [isCreating, isAnalyzing, handleFileRemove, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Project"
      className="max-w-2xl"
      closeOnBackdropClick={!isCreating && !isAnalyzing}
    >
      <div className="p-6">
        {/* File Upload Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Upload ROM File
          </h3>
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile}
            error={fileError}
            validateFile={validateRomFile}
            disabled={isAnalyzing || isCreating}
          />
        </div>

        {/* ROM Analysis Results */}
        {isAnalyzing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-800">Analyzing ROM file...</p>
            </div>
          </div>
        )}

        {romHeader && !isAnalyzing && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <Gamepad2 className="h-5 w-5 mr-2" />
              ROM Information
            </h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Game Title
                  </label>
                  <p className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                    {romHeader.title || 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <p className="text-sm text-gray-900">
                    {romHeader.region}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ROM Type
                  </label>
                  <p className="text-sm text-gray-900">
                    {romHeader.mapMode} ({romHeader.romSpeed})
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <p className="text-sm text-gray-900">
                    {romHeader.version}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ROM Size
                  </label>
                  <p className="text-sm text-gray-900">
                    {romHeader.romSize} KB
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chipset
                  </label>
                  <p className="text-sm text-gray-900">
                    {romHeader.chipset}
                  </p>
                </div>
              </div>
              
              {/* Validation Status */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center">
                  {romHeader.isValid ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">Valid ROM header detected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800">ROM header may be incomplete or corrupted</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Name Input */}
        {(romHeader || selectedFile) && (
          <div className="mb-6">
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter project name..."
              disabled={isCreating}
            />
            <p className="mt-1 text-xs text-gray-500">
              This name will be used to identify your project in the dashboard.
            </p>
          </div>
        )}

        {/* Platform Selection */}
        {(romHeader || selectedFile) && (
          <PlatformSelector
            selectedPlatformId={selectedPlatformId}
            onPlatformSelect={setSelectedPlatformId}
            disabled={isCreating || isAnalyzing}
            className="mb-6"
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isCreating || isAnalyzing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button
            onClick={handleCreateProject}
            disabled={!projectName.trim() || !selectedPlatformId || isCreating || isAnalyzing}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              'flex items-center',
              {
                'bg-blue-600 text-white hover:bg-blue-700': projectName.trim() && selectedPlatformId && !isCreating && !isAnalyzing,
                'bg-gray-300 text-gray-500 cursor-not-allowed': !projectName.trim() || !selectedPlatformId || isCreating || isAnalyzing,
              }
            )}
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
