import { useState, useRef, useCallback } from 'react'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  accept?: string
  maxSize?: number // in bytes
  className?: string
  disabled?: boolean
  selectedFile?: File | null
  error?: string | null
  validateFile?: (file: File) => Promise<{ isValid: boolean; error?: string }>
}

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  accept = '.smc,.sfc,.fig,.swc,.rom,.bin',
  maxSize = 8 * 1024 * 1024, // 8MB default
  className,
  disabled = false,
  selectedFile = null,
  error = null,
  validateFile
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileValidation = useCallback(async (file: File): Promise<boolean> => {
    // Basic size validation
    if (file.size > maxSize) {
      return false
    }

    // Custom validation if provided
    if (validateFile) {
      setIsValidating(true)
      try {
        const result = await validateFile(file)
        return result.isValid
      } catch (err) {
        console.error('File validation error:', err)
        return false
      } finally {
        setIsValidating(false)
      }
    }

    return true
  }, [maxSize, validateFile])

  const handleFileSelection = useCallback(async (file: File) => {
    if (disabled) return

    const isValid = await handleFileValidation(file)
    if (isValid) {
      onFileSelect(file)
    }
  }, [disabled, handleFileValidation, onFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFileSelection(files[0])
    }
  }, [disabled, handleFileSelection])

  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFileSelection(files[0])
    }
  }, [handleFileSelection])

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFileRemove) {
      onFileRemove()
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileRemove])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  return (
    <div className={clsx('w-full', className)}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200',
          {
            'border-blue-300 bg-blue-50': isDragOver && !disabled,
            'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100': !isDragOver && !disabled && !selectedFile,
            'border-green-300 bg-green-50': selectedFile && !error,
            'border-red-300 bg-red-50': error,
            'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50': disabled,
          }
        )}
      >
        {isValidating ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-600">Validating file...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="h-8 w-8 text-green-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {onFileRemove && (
              <button
                onClick={handleRemove}
                className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md"
                aria-label="Remove file"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className={clsx(
              'h-12 w-12 mb-4',
              isDragOver ? 'text-blue-600' : 'text-gray-400'
            )} />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragOver ? 'Drop your ROM file here' : 'Upload ROM File'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop your SNES ROM file here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: .smc, .sfc, .fig, .swc, .rom, .bin
            </p>
            <p className="text-xs text-gray-500">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
