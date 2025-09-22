import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Plus, Check, X } from 'lucide-react'
import DataTable, { type DataTableProps } from './DataTable'
import { useAuthStore } from '../stores/auth-store'
import { db } from '../lib/supabase'
import type { Block, BlockPart } from '@prisma/client'
import clsx from 'clsx'

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
  const { user } = useAuthStore()
  const [currentBank, setCurrentBank] = useState<number>(0)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [blockParts, setBlockParts] = useState<{ [blockId: string]: BlockPart[] }>({})
  const [partsLoading, setPartsLoading] = useState(false)
  const [partsError, setPartsError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)
  const [showAddPartForm, setShowAddPartForm] = useState<{ [blockId: string]: boolean }>({})
  const [addPartFormData, setAddPartFormData] = useState<{ [blockId: string]: Partial<BlockPart> }>({})
  const [partValidationErrors, setPartValidationErrors] = useState<{ [blockId: string]: Record<string, string> }>({})

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

  const handleAddPart = (blockId: string) => {
    setShowAddPartForm(prev => ({ ...prev, [blockId]: true }))
    setAddPartFormData(prev => ({ ...prev, [blockId]: {} }))
    setPartValidationErrors(prev => ({ ...prev, [blockId]: {} }))
  }

  const handleCancelAddPart = (blockId: string) => {
    setShowAddPartForm(prev => ({ ...prev, [blockId]: false }))
    setAddPartFormData(prev => ({ ...prev, [blockId]: {} }))
    setPartValidationErrors(prev => ({ ...prev, [blockId]: {} }))
  }

  const validatePartForm = (blockId: string): boolean => {
    const formData = addPartFormData[blockId] || {}
    const errors: Record<string, string> = {}

    // Name validation
    if (!formData.name?.trim()) {
      errors.name = 'Name is required'
    }

    // Location validation (hex)
    if (formData.location === undefined || formData.location === null) {
      errors.location = 'Location is required'
    }

    // Size validation
    if (!formData.size || formData.size <= 0) {
      errors.size = 'Size must be a positive number'
    }

    // Type validation
    if (!formData.type?.trim()) {
      errors.type = 'Type is required'
    }

    // Index validation (optional)
    if (formData.index !== undefined && formData.index !== null && formData.index < 0) {
      errors.index = 'Index must be non-negative'
    }

    setPartValidationErrors(prev => ({ ...prev, [blockId]: errors }))
    return Object.keys(errors).length === 0
  }

  const handleSaveAddPart = async (blockId: string) => {
    if (!user?.id || !validatePartForm(blockId)) {
      return
    }

    const formData = addPartFormData[blockId]
    if (!formData) return

    try {
      const partData = {
        name: formData.name!.trim(),
        location: formData.location!,
        size: formData.size!,
        type: formData.type!.trim(),
        index: formData.index || undefined,
        blockId
      }

      const { data, error } = await db.blockParts.create(partData, user.id)

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        // Update local state
        setBlockParts(prev => {
          const updated = { ...prev }
          if (!updated[blockId]) {
            updated[blockId] = []
          }
          updated[blockId] = [...updated[blockId], data]

          // Sort parts by index
          updated[blockId].sort((a, b) => {
            const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
            const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
            return indexA - indexB
          })

          return updated
        })

        // Reset form
        handleCancelAddPart(blockId)
      }
    } catch (err) {
      console.error('Error adding part:', err)
      setPartValidationErrors(prev => ({
        ...prev,
        [blockId]: { name: 'Failed to add part. Please try again.' }
      }))
    }
  }

  const renderPartEditableCell = (
    blockId: string,
    field: keyof BlockPart,
    type: 'text' | 'number' | 'hex' = 'text'
  ) => {
    const formData = addPartFormData[blockId] || {}
    const errors = partValidationErrors[blockId] || {}
    let value = (formData as any)[field] || ''

    // Handle hex display for location
    if (field === 'location' && typeof value === 'number') {
      value = `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
    }

    const error = errors[field]

    const handleChange = (newValue: string) => {
      let processedValue: any = newValue

      // Handle hex input for location
      if (field === 'location') {
        const hexValue = newValue.replace(/^0x/i, '')
        if (/^[0-9A-Fa-f]*$/.test(hexValue) && hexValue !== '') {
          processedValue = parseInt(hexValue, 16)
        } else if (hexValue === '') {
          processedValue = null
        } else {
          processedValue = newValue // Keep invalid input for validation
        }
      } else if (type === 'number') {
        processedValue = newValue ? Number(newValue) : null
      }

      setAddPartFormData(prev => ({
        ...prev,
        [blockId]: { ...prev[blockId], [field]: processedValue }
      }))

      // Clear validation error when user starts typing
      if (error) {
        setPartValidationErrors(prev => {
          const newErrors = { ...prev }
          if (newErrors[blockId]) {
            const blockErrors = { ...newErrors[blockId] }
            delete blockErrors[field]
            newErrors[blockId] = blockErrors
          }
          return newErrors
        })
      }
    }

    const baseClasses = clsx(
      'w-full px-2 py-1 text-sm border rounded',
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    )

    return (
      <div>
        <input
          type={type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={clsx(baseClasses, field === 'location' && 'font-mono')}
          placeholder={
            field === 'name' ? 'Part name' :
            field === 'location' ? '0x1000' :
            field === 'size' ? 'Size in bytes' :
            field === 'type' ? 'e.g., code, data' :
            field === 'index' ? 'Order' : ''
          }
          min={type === 'number' ? 0 : undefined}
        />
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </div>
    )
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

  // Enhanced columns with expand functionality
  const enhancedColumns = useMemo(() => {
    return columns.map(col => {
      if (col.key === 'expand') {
        return {
          ...col,
          render: (_value: any, row: BlockWithAddresses) => (
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

          return (
            <div className="px-6 py-2 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-700">Block Parts:</div>
                <button
                  onClick={() => handleAddPart(block.id)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Part
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">START</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIZE</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">END</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Add Form Row - Show when no parts or when add form is active */}
                    {(parts.length === 0 || showAddPartForm[block.id]) && (
                      <tr className="bg-blue-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {renderPartEditableCell(block.id, 'name', 'text')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {renderPartEditableCell(block.id, 'location', 'hex')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {renderPartEditableCell(block.id, 'size', 'number')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-400">
                          {/* END address - calculated automatically */}
                          —
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {renderPartEditableCell(block.id, 'type', 'text')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {renderPartEditableCell(block.id, 'index', 'number')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleSaveAddPart(block.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelAddPart(block.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Existing Parts */}
                    {parts.map((part, index) => (
                      <tr key={part.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{part.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                          0x{part.location.toString(16).toUpperCase().padStart(6, '0')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{part.size}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                          0x{(part.location + part.size).toString(16).toUpperCase().padStart(6, '0')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{part.type}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{part.index || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                          {/* Future: Add edit/delete actions here */}
                          —
                        </td>
                      </tr>
                    ))}

                    {/* Empty state message when no parts and no add form */}
                    {parts.length === 0 && !showAddPartForm[block.id] && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-gray-500 text-sm">
                          No parts found for this block. Click "Add Part" to create the first part.
                        </td>
                      </tr>
                    )}
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
