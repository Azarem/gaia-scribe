import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DataTable, { type DataTableProps } from './DataTable'
import type { File } from '@prisma/client'

interface FilesDataTableProps extends Omit<DataTableProps<File>, 'data'> {
  data: File[]
}

export default function FilesDataTable({ data, ...props }: FilesDataTableProps) {
  const [currentBank, setCurrentBank] = useState<number>(0)

  // Group files by memory bank (upper address byte)
  const filesByBank = useMemo(() => {
    const banks: { [bank: number]: File[] } = {}

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
      <DataTable
        {...props}
        data={[]}
        emptyMessage="No files found. Click 'Add File' to create your first entry."
      />
    )
  }

  return (
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
        data={currentBankFiles}
        emptyMessage={`No files found in Bank 0x${currentBank.toString(16).toUpperCase().padStart(2, '0')}. Files may exist in other banks.`}
      />
    </div>
  )
}
