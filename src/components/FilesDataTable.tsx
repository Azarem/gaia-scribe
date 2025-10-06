import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import DataTable, { type DataTableProps } from './DataTable'
import type { File as PrismaFile, ScribeProject } from '@prisma/client'
import RomPathModal from './RomPathModal'
import GraphicsViewerModal from './GraphicsViewerModal'
import { extractAndConvertGraphics } from '../lib/graphics-extractor'

interface FilesDataTableProps extends Omit<DataTableProps<PrismaFile>, 'data'> {
  data: PrismaFile[]
  project?: ScribeProject // Optional project for BaseRomID access
}

export default function FilesDataTable({ data, project, ...props }: FilesDataTableProps) {
  const [currentBank, setCurrentBank] = useState<number>(0)

  // Graphics viewer state
  const [showRomPathModal, setShowRomPathModal] = useState(false)
  const [showGraphicsViewer, setShowGraphicsViewer] = useState(false)
  const [selectedFile, setSelectedFile] = useState<PrismaFile | null>(null)
  const [graphicsImageData, setGraphicsImageData] = useState<ImageData | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)

  // Group files by memory bank (upper address byte)
  const filesByBank = useMemo(() => {
    const banks: { [bank: number]: PrismaFile[] } = {}

    data.forEach(file => {
      if (file.location !== null && file.location !== undefined) {
        const bank = (file.location & 0xFF0000) >> 16
        if (!banks[bank]) {
          banks[bank] = []
        }
        banks[bank].push(file)
      } else {
        // Files without location go to bank 0
        if (!banks[0]) {
          banks[0] = []
        }
        banks[0].push(file)
      }
    })

    // Sort files within each bank by location
    Object.keys(banks).forEach(bankKey => {
      const bank = parseInt(bankKey)
      banks[bank].sort((a, b) => (a.location || 0) - (b.location || 0))
    })

    return banks
  }, [data])

  // Get available banks (only banks that contain files)
  const availableBanks = useMemo(() => {
    return Object.keys(filesByBank)
      .map(bank => parseInt(bank))
      .sort((a, b) => a - b)
  }, [filesByBank])

  // Set initial bank to first available bank
  useMemo(() => {
    if (availableBanks.length > 0 && !availableBanks.includes(currentBank)) {
      setCurrentBank(availableBanks[0])
    }
  }, [availableBanks, currentBank])

  // Get files for current bank
  const currentBankFiles = useMemo(() => {
    return filesByBank[currentBank] || []
  }, [filesByBank, currentBank])

  const handlePreviousBank = useCallback(() => {
    const currentIndex = availableBanks.indexOf(currentBank)
    if (currentIndex > 0) {
      setCurrentBank(availableBanks[currentIndex - 1])
    }
  }, [availableBanks, currentBank])

  const handleNextBank = useCallback(() => {
    const currentIndex = availableBanks.indexOf(currentBank)
    if (currentIndex < availableBanks.length - 1) {
      setCurrentBank(availableBanks[currentIndex + 1])
    }
  }, [availableBanks, currentBank])

  const handleBankSelect = (bank: number) => {
    setCurrentBank(bank)
  }

  // Handle view graphics click
  const handleViewGraphics = useCallback((file: PrismaFile) => {
    setSelectedFile(file)
    setExtractionError(null)
    setShowRomPathModal(true)
  }, [])

  // Handle ROM selection and graphics extraction
  const handleRomConfirm = useCallback(async (_romFile: File, romData: Uint8Array) => {
    if (!selectedFile) return

    setIsExtracting(true)
    setExtractionError(null)

    try {
      // Extract and convert graphics
      const imageData = await extractAndConvertGraphics(romData, selectedFile)

      setGraphicsImageData(imageData)
      setShowRomPathModal(false)
      setShowGraphicsViewer(true)
    } catch (error) {
      console.error('Error extracting graphics:', error)
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract graphics')
    } finally {
      setIsExtracting(false)
    }
  }, [selectedFile])

  // Handle graphics viewer close
  const handleGraphicsViewerClose = useCallback(() => {
    setShowGraphicsViewer(false)
    setGraphicsImageData(null)
    setSelectedFile(null)
  }, [])

  // Enhanced columns with actions for Graphics files
  const enhancedColumns = useMemo(() => {
    return props.columns?.map(col => {
      if (col.key === 'actions') {
        return {
          ...col,
          render: (_value: any, row: PrismaFile) => {
            // Only show Eye icon for Graphics type files
            if (row.type === 'Bitmap') {
              return (
                <button
                  onClick={() => handleViewGraphics(row)}
                  className="p-1 hover:bg-gray-100 rounded text-blue-600 hover:text-blue-900"
                  title="View Graphics"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )
            }
            return null
          }
        }
      }
      return col
    }) || []
  }, [props.columns, handleViewGraphics])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          handlePreviousBank()
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          handleNextBank()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [availableBanks, currentBank, handlePreviousBank, handleNextBank])

  if (availableBanks.length === 0) {
    return (
      <>
        <DataTable
          {...props}
          columns={enhancedColumns}
          data={[]}
          emptyMessage="No files found. Click 'Add File' to create your first entry."
        />

        {/* ROM Path Modal */}
        <RomPathModal
          isOpen={showRomPathModal}
          onClose={() => setShowRomPathModal(false)}
          onConfirm={handleRomConfirm}
          title="Select ROM File"
          description={isExtracting ? 'Extracting graphics...' : 'Select the ROM file to extract graphics from.'}
          baseRomId={project?.gameRomBranchId}
        />

        {/* Graphics Viewer Modal */}
        <GraphicsViewerModal
          isOpen={showGraphicsViewer}
          onClose={handleGraphicsViewerClose}
          file={selectedFile}
          imageData={graphicsImageData}
        />

        {/* Extraction Error Display */}
        {extractionError && (
          <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            <strong>Error:</strong> {extractionError}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Bank Navigation */}
        <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700" title="Use Ctrl+← and Ctrl+→ to navigate banks">
              Memory Bank:
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousBank}
                disabled={availableBanks.indexOf(currentBank) === 0}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Bank"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={currentBank}
                onChange={(e) => handleBankSelect(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-mono bg-white"
              >
                {availableBanks.map(bank => (
                  <option key={bank} value={bank}>
                    Bank 0x{bank.toString(16).toUpperCase().padStart(2, '0')}
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextBank}
                disabled={availableBanks.indexOf(currentBank) === availableBanks.length - 1}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Bank"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {currentBankFiles.length} file{currentBankFiles.length !== 1 ? 's' : ''} in this bank
            {availableBanks.length > 1 && (
              <span className="ml-2">
                • {availableBanks.length} bank{availableBanks.length !== 1 ? 's' : ''} total
              </span>
            )}
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          {...props}
          columns={enhancedColumns}
          data={currentBankFiles}
          emptyMessage={`No files found in Bank 0x${currentBank.toString(16).toUpperCase().padStart(2, '0')}. Files may exist in other banks.`}
        />

        {/* Extraction Error Display */}
        {extractionError && (
          <div className="mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            <strong>Error:</strong> {extractionError}
          </div>
        )}
      </div>

      {/* ROM Path Modal */}
      <RomPathModal
        isOpen={showRomPathModal}
        onClose={() => setShowRomPathModal(false)}
        onConfirm={handleRomConfirm}
        title="Select ROM File"
        description={isExtracting ? 'Extracting graphics...' : 'Select the ROM file to extract graphics from.'}
        baseRomId={project?.gameRomBranchId}
      />

      {/* Graphics Viewer Modal */}
      <GraphicsViewerModal
        isOpen={showGraphicsViewer}
        onClose={handleGraphicsViewerClose}
        file={selectedFile}
        imageData={graphicsImageData}
      />
    </>
  )
}
