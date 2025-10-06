import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { Upload, AlertCircle, File, Trash2 } from 'lucide-react'
import { romCacheDB } from '../lib/rom-cache-db'

interface RomPathModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (file: File, fileData: Uint8Array) => void
  title?: string
  description?: string
  baseRomId?: string | null // Optional BaseRomID for cache key
}

// ROM file manager using IndexedDB for large file support
class RomFileManager {
  /**
   * Save ROM file data to IndexedDB with BaseRomID-specific key
   * Supports large files (up to 32MB+) without base64 encoding overhead
   */
  static async saveRomFile(file: File, data: Uint8Array, baseRomId?: string | null): Promise<void> {
    if (!baseRomId) {
      console.warn('Cannot cache ROM without BaseRomID')
      return
    }

    try {
      await romCacheDB.saveRom(baseRomId, file, data)
    } catch (error) {
      console.warn('Failed to save ROM file to cache:', error)
    }
  }

  /**
   * Get saved ROM file data from IndexedDB for a specific BaseRomID
   */
  static async getSavedRomFile(baseRomId?: string | null): Promise<{ file: File; data: Uint8Array } | null> {
    if (!baseRomId) {
      return null
    }

    try {
      return await romCacheDB.getRom(baseRomId)
    } catch (error) {
      console.warn('Failed to load ROM file from cache:', error)
      return null
    }
  }

  /**
   * Clear ROM file data for a specific BaseRomID
   */
  static async clearRomFile(baseRomId?: string | null): Promise<void> {
    if (!baseRomId) {
      return
    }

    try {
      await romCacheDB.deleteRom(baseRomId)
    } catch (error) {
      console.warn('Failed to clear ROM file cache:', error)
    }
  }

  /**
   * Get saved ROM metadata (name and size only) for a specific BaseRomID
   */
  static async getSavedRomMetadata(baseRomId?: string | null): Promise<{ name: string; size: number } | null> {
    if (!baseRomId) {
      return null
    }

    try {
      return await romCacheDB.getRomMetadata(baseRomId)
    } catch (error) {
      console.warn('Failed to load ROM metadata from cache:', error)
      return null
    }
  }

  /**
   * Check if cached ROM data exists for a specific BaseRomID
   */
  static async hasCachedRom(baseRomId?: string | null): Promise<boolean> {
    if (!baseRomId) {
      return false
    }

    try {
      return await romCacheDB.hasRom(baseRomId)
    } catch (error) {
      return false
    }
  }
}

export default function RomPathModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Select ROM File',
  description = 'Please select a ROM file for building the project.',
  baseRomId
}: RomPathModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [savedFileInfo, setSavedFileInfo] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-load cached ROM data when modal opens if available for this BaseRomID
  useEffect(() => {
    if (!isOpen) return

    const loadCachedRom = async () => {
      setError(null)
      setSelectedFile(null)
      setFileData(null)

      if (!baseRomId) {
        setSavedFileInfo(null)
        return
      }

      try {
        // Check for cached ROM metadata
        const savedInfo = await RomFileManager.getSavedRomMetadata(baseRomId)
        setSavedFileInfo(savedInfo)

        // Auto-confirm with cached data if available
        if (savedInfo) {
          const cached = await RomFileManager.getSavedRomFile(baseRomId)
          if (cached) {
            console.log(`Auto-loading cached ROM for BaseRomID: ${baseRomId}`)
            // Automatically use cached ROM without showing modal
            onConfirm(cached.file, cached.data)
            onClose()
          }
        }
      } catch (error) {
        console.warn('Failed to load cached ROM:', error)
        setSavedFileInfo(null)
      }
    }

    loadCachedRom()
  }, [isOpen, baseRomId, onConfirm, onClose])

  const validateRomFile = (file: File): boolean => {
    // Check for common ROM file extensions
    const validExtensions = ['.smc', '.sfc', '.rom', '.bin', '.nes', '.gb', '.gbc', '.gba']
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    )

    if (!hasValidExtension) {
      setError(`ROM file should have one of these extensions: ${validExtensions.join(', ')}`)
      return false
    }

    // Check file size (minimum 32KB, maximum 32MB)
    const minSize = 32 * 1024 // 32KB
    const maxSize = 32 * 1024 * 1024 // 32MB

    if (file.size < minSize) {
      setError(`ROM file is too small (${Math.round(file.size / 1024)}KB). Expected at least ${minSize / 1024}KB.`)
      return false
    }

    if (file.size > maxSize) {
      setError(`ROM file is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is ${maxSize / 1024 / 1024}MB.`)
      return false
    }

    setError(null)
    return true
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!validateRomFile(file)) {
      setSelectedFile(null)
      setFileData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Read file as binary data
      const arrayBuffer = await file.arrayBuffer()
      const data = new Uint8Array(arrayBuffer)

      setSelectedFile(file)
      setFileData(data)
    } catch (_error) {
      setError('Failed to read the selected file. Please try again.')
      setSelectedFile(null)
      setFileData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseSaved = async () => {
    try {
      const saved = await RomFileManager.getSavedRomFile(baseRomId)
      if (!saved) {
        setError('No saved ROM file found')
        return
      }

      setSelectedFile(saved.file)
      setFileData(saved.data)
      setError(null)
    } catch (error) {
      setError('Failed to load saved ROM file')
      console.error('Error loading saved ROM:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let fileToUse = selectedFile
    let dataToUse = fileData

    // If no file selected but we have a saved file, use that
    if (!fileToUse && savedFileInfo) {
      try {
        const saved = await RomFileManager.getSavedRomFile(baseRomId)
        if (saved) {
          fileToUse = saved.file
          dataToUse = saved.data
        }
      } catch (error) {
        console.error('Error loading saved ROM:', error)
      }
    }

    if (!fileToUse || !dataToUse) {
      setError('Please select a ROM file')
      return
    }

    setIsLoading(true)

    try {
      // Save the ROM file for future use with BaseRomID-specific key
      await RomFileManager.saveRomFile(fileToUse, dataToUse, baseRomId)

      // Call the confirm callback with File and data
      onConfirm(fileToUse, dataToUse)

      // Close the modal
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process ROM file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setFileData(null)
    setError(null)
    onClose()
  }

  const handleClearSaved = async () => {
    try {
      await RomFileManager.clearRomFile(baseRomId)
      setSavedFileInfo(null)
      setError(null)
    } catch (error) {
      console.error('Error clearing saved ROM:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / 1024 / 1024)} MB`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-4">
            {description}
          </p>

          <div className="space-y-4">
            {/* File Picker */}
            <div>
              <label htmlFor="romFile" className="block text-sm font-medium text-gray-700 mb-2">
                ROM File
              </label>

              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="romFile"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a ROM file</span>
                      <input
                        ref={fileInputRef}
                        id="romFile"
                        name="romFile"
                        type="file"
                        accept=".smc,.sfc,.rom,.bin,.nes,.gb,.gbc,.gba"
                        onChange={handleFileSelect}
                        className="sr-only"
                        disabled={isLoading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    .smc, .sfc, .rom, .bin, .nes, .gb, .gbc, .gba files only
                  </p>
                </div>
              </div>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center">
                    <File className="h-5 w-5 text-green-600 mr-2" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-800">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-green-600">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {error}
                </div>
              )}
            </div>

            {/* Previously Used File */}
            {savedFileInfo && !selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <File className="h-4 w-4 text-blue-600 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-blue-800">
                        Previously used: {savedFileInfo.name}
                      </div>
                      <div className="text-xs text-blue-600">
                        {formatFileSize(savedFileInfo.size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleUseSaved}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSaved}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || (!selectedFile && !savedFileInfo)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Export the RomFileManager for use in other components
export { RomFileManager }
