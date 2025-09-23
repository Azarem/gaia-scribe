import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { Upload, AlertCircle, File, Trash2 } from 'lucide-react'
import { decodeBase64, encodeBase64 } from '@gaialabs/shared'

// ROM file metadata for persistence
interface RomFileMetadata {
  name: string
  size: number
  lastModified: number
  data: string // Base64 encoded file data
}

interface RomPathModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (file: File, fileData: Uint8Array) => void
  title?: string
  description?: string
}

// ROM file manager for localStorage persistence
class RomFileManager {
  private static readonly STORAGE_KEY = 'scribe_rom_file'

  static saveRomFile(file: File, data: Uint8Array): void {
    try {
      const metadata: RomFileMetadata = {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        data: encodeBase64(data) // Convert to base64
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.warn('Failed to save ROM file to localStorage:', error)
    }
  }

  static getSavedRomFile(): { file: File; data: Uint8Array } | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (!saved) return null

      const metadata: RomFileMetadata = JSON.parse(saved)

      // Convert base64 back to Uint8Array
      const data = decodeBase64(metadata.data)

      // Create a File object from the metadata
      const file = new (File as any)([data], metadata.name, {
        lastModified: metadata.lastModified
      })

      return { file, data }
    } catch (error) {
      console.warn('Failed to load ROM file from localStorage:', error)
      return null
    }
  }

  static clearRomFile(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  static getSavedRomMetadata(): { name: string; size: number } | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (!saved) return null

      const metadata: RomFileMetadata = JSON.parse(saved)
      return { name: metadata.name, size: metadata.size }
    } catch (_error) {
      return null
    }
  }
}

export default function RomPathModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Select ROM File',
  description = 'Please select a ROM file for building the project.'
}: RomPathModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [savedFileInfo, setSavedFileInfo] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load saved ROM file info when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedInfo = RomFileManager.getSavedRomMetadata()
      setSavedFileInfo(savedInfo)
      setError(null)
      setSelectedFile(null)
      setFileData(null)
    }
  }, [isOpen])

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
    const saved = RomFileManager.getSavedRomFile()
    if (!saved) {
      setError('No saved ROM file found')
      return
    }

    setSelectedFile(saved.file)
    setFileData(saved.data)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let fileToUse = selectedFile
    let dataToUse = fileData

    // If no file selected but we have a saved file, use that
    if (!fileToUse && savedFileInfo) {
      const saved = RomFileManager.getSavedRomFile()
      if (saved) {
        fileToUse = saved.file
        dataToUse = saved.data
      }
    }

    if (!fileToUse || !dataToUse) {
      setError('Please select a ROM file')
      return
    }

    setIsLoading(true)

    try {
      // Save the ROM file for future use
      RomFileManager.saveRomFile(fileToUse, dataToUse)

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

  const handleClearSaved = () => {
    RomFileManager.clearRomFile()
    setSavedFileInfo(null)
    setError(null)
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
