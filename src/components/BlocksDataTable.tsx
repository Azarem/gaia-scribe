import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import DataTable, { type DataTableProps, type ColumnDefinition } from './DataTable'
import { db } from '../lib/supabase'
import type { Block, BlockPart } from '@prisma/client'

interface BlockWithAddresses extends Block {
  startAddress?: number
  endAddress?: number
  parts?: BlockPart[]
}

interface BlocksDataTableProps extends Omit<DataTableProps<BlockWithAddresses>, 'data'> {
  data: Block[]
  projectId: string
}

export default function BlocksDataTable({ data, projectId, columns, ...props }: BlocksDataTableProps) {
  const [currentBank, setCurrentBank] = useState<number>(0)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [blockParts, setBlockParts] = useState<{ [blockId: string]: BlockPart[] }>({})
  const [partsLoading, setPartsLoading] = useState(false)
  const [partsError, setPartsError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)

  // Fetch all BlockParts for the project
  useEffect(() => {
    const fetchBlockParts = async () => {
      if (!projectId || data.length === 0) {
        setDataReady(true) // No blocks means we're ready (empty state)
        return
      }

      setPartsLoading(true)
      setPartsError(null)
      setDataReady(false)

      try {
        const { data: parts, error } = await db.blockParts.getByProject(projectId)

        if (error) {
          console.error('Error fetching block parts:', error)
          setPartsError('Failed to load block parts')
          setDataReady(true) // Set ready even on error to prevent infinite loading
          return
        }

        // Group parts by blockId
        const partsByBlock: { [blockId: string]: BlockPart[] } = {}
        parts?.forEach(part => {
          if (!partsByBlock[part.blockId]) {
            partsByBlock[part.blockId] = []
          }
          partsByBlock[part.blockId].push(part)
        })

        // Sort parts within each block by index (ascending)
        Object.keys(partsByBlock).forEach(blockId => {
          partsByBlock[blockId].sort((a, b) => {
            const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
            const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
            return indexA - indexB
          })
        })

        setBlockParts(partsByBlock)
        setDataReady(true)
      } catch (err) {
        console.error('Error fetching block parts:', err)
        setPartsError('Failed to load block parts')
        setDataReady(true)
      } finally {
        setPartsLoading(false)
      }
    }

    fetchBlockParts()
  }, [projectId, data.length])

  // Calculate addresses and group blocks by memory bank
  const blocksWithAddresses = useMemo(() => {
    // Only calculate addresses when data is ready
    if (!dataReady) {
      return data.map(block => ({
        ...block,
        startAddress: undefined,
        endAddress: undefined,
        parts: []
      }))
    }

    return data.map(block => {
      const parts = blockParts[block.id] || []
      let startAddress: number | undefined
      let endAddress: number | undefined

      if (parts.length > 0) {
        // Ensure parts are sorted by index before calculating addresses
        const sortedParts = [...parts].sort((a, b) => {
          const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
          const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
          return indexA - indexB
        })

        // Calculate START as minimum location
        const locations = sortedParts
          .map(part => part.location)
          .filter(loc => loc !== null && loc !== undefined)

        // Calculate END as maximum (location + size)
        const endAddresses = sortedParts
          .map(part => part.location + part.size)
          .filter(addr => !isNaN(addr))

        if (locations.length > 0) {
          startAddress = Math.min(...locations)
        }

        if (endAddresses.length > 0) {
          endAddress = Math.max(...endAddresses)
        }

      }

      return {
        ...block,
        startAddress,
        endAddress,
        parts
      }
    })
  }, [data, blockParts, dataReady])

  const blocksByBank = useMemo(() => {
    const banks: { [bank: number]: BlockWithAddresses[] } = {}

    blocksWithAddresses.forEach(block => {
      let bank = 0 // Default bank

      if (block.startAddress !== undefined && block.startAddress !== null) {
        bank = (block.startAddress & 0xFF0000) >> 16
      }

      if (!banks[bank]) {
        banks[bank] = []
      }
      banks[bank].push(block)
    })

    // Sort blocks within each bank by start address
    Object.keys(banks).forEach(bankKey => {
      const bank = parseInt(bankKey)
      banks[bank].sort((a, b) => {
        const addrA = a.startAddress || 0
        const addrB = b.startAddress || 0
        return addrA - addrB
      })
    })
    return banks
  }, [blocksWithAddresses])

  // Get available banks (only banks that contain blocks)
  const availableBanks = useMemo(() => {
    return Object.keys(blocksByBank)
      .map(bank => parseInt(bank))
      .sort((a, b) => a - b)
  }, [blocksByBank])

  // Set initial bank to first available bank
  useMemo(() => {
    if (availableBanks.length > 0 && !availableBanks.includes(currentBank)) {
      setCurrentBank(availableBanks[0])
    }
  }, [availableBanks, currentBank])

  // Get blocks for current bank
  const currentBankBlocks = useMemo(() => {
    return blocksByBank[currentBank] || []
  }, [blocksByBank, currentBank])

  const handlePreviousBank = () => {
    const currentIndex = availableBanks.indexOf(currentBank)
    if (currentIndex > 0) {
      setCurrentBank(availableBanks[currentIndex - 1])
    }
  }

  const handleNextBank = () => {
    const currentIndex = availableBanks.indexOf(currentBank)
    if (currentIndex < availableBanks.length - 1) {
      setCurrentBank(availableBanks[currentIndex + 1])
    }
  }

  const handleBankSelect = (bank: number) => {
    setCurrentBank(bank)
  }

  const toggleBlockExpansion = (blockId: string) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
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
  }, [availableBanks, currentBank])

  // Enhanced columns with expand functionality
  const enhancedColumns = useMemo(() => {
    return columns.map(col => {
      if (col.key === 'expand') {
        return {
          ...col,
          render: (value: any, row: BlockWithAddresses) => (
            <button
              onClick={() => toggleBlockExpansion(row.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title={expandedBlocks.has(row.id) ? 'Collapse' : 'Expand'}
            >
              {expandedBlocks.has(row.id) ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )
        }
      }
      return col
    })
  }, [columns, expandedBlocks])

  if (availableBanks.length === 0) {
    return (
      <DataTable
        {...props}
        data={[]}
        columns={enhancedColumns}
        loading={props.loading || partsLoading || !dataReady}
        error={props.error || partsError}
        emptyMessage="No blocks found. Click 'Add Block' to create your first entry."
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
          {currentBankBlocks.length} block{currentBankBlocks.length !== 1 ? 's' : ''} in this bank
          {availableBanks.length > 1 && (
            <span className="ml-2">
              • {availableBanks.length} bank{availableBanks.length !== 1 ? 's' : ''} total
            </span>
          )}
        </div>
      </div>

      {/* Data Table with Hierarchical Display */}
      <DataTable
        {...props}
        data={currentBankBlocks}
        columns={enhancedColumns}
        loading={props.loading || partsLoading || !dataReady}
        error={props.error || partsError}
        emptyMessage={`No blocks found in Bank 0x${currentBank.toString(16).toUpperCase().padStart(2, '0')}. Blocks may exist in other banks.`}
        expandedRows={expandedBlocks}
        renderExpandedContent={(block: BlockWithAddresses) => {
          const parts = block.parts || []
          if (parts.length === 0) {
            return (
              <div className="px-6 py-4 text-gray-500 text-sm">
                No parts found for this block.
              </div>
            )
          }

          return (
            <div className="px-6 py-2 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-2">Block Parts:</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">START</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">END</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parts.map((part, index) => (
                      <tr key={part.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{part.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                          0x{part.location.toString(16).toUpperCase().padStart(6, '0')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                          0x{(part.location + part.size).toString(16).toUpperCase().padStart(6, '0')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{part.type}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{part.index || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }}
      />
    </div>
  )
}
