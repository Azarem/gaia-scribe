import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Check, X, Trash2, Hammer, Eye, Plus } from 'lucide-react'
import DataTable, { type DataTableProps } from './DataTable'
import { useAuthStore } from '../stores/auth-store'
import { useArtifactViewerStore } from '../stores/artifact-viewer-store'
import { db, supabase } from '../lib/supabase'
import type { Block, BlockPart, ScribeProject } from '@prisma/client'
import clsx from 'clsx'
import RomPathModal from './RomPathModal'
import NotificationModal from './NotificationModal'
import { createBuildOrchestrator, type BuildProgressCallback } from '../lib/build-orchestrator'

interface BlockWithAddresses extends Block {
  startAddress?: number
  endAddress?: number
  parts?: BlockPart[]
}

// Unified row structure for inline editing
interface BaseGridRow {
  id: string
  rowType: 'block' | 'part'
  level: number // 0 for blocks, 1 for parts
  parentId?: string // For parts, this is the block ID
  isExpanded?: boolean // For blocks with parts
  isDirty?: boolean // Has unsaved changes
  originalData?: any // Original values before editing
}

interface BlockGridRow extends BaseGridRow {
  rowType: 'block'
  // Block-specific fields
  name: string
  startAddress?: number
  endAddress?: number
  movable?: boolean
  group?: string | null
  scene?: string | null
  postProcess?: string | null
  meta?: any
  projectId?: string
  // Audit fields
  createdAt: Date
  createdBy: string
  updatedAt?: Date | null
  updatedBy?: string | null
  deletedAt?: Date | null
  deletedBy?: string | null
}

interface PartGridRow extends BaseGridRow {
  rowType: 'part'
  blockId: string
  // Part-specific fields
  name: string
  location: number
  size: number
  end?: number // Calculated field: location + size
  type: string
  index?: number | null
  // Audit fields
  createdAt: Date
  createdBy: string
  updatedAt?: Date | null
  updatedBy?: string | null
  deletedAt?: Date | null
  deletedBy?: string | null
}

type GridRow = BlockGridRow | PartGridRow

// Editable field configuration
interface EditableField {
  key: string
  label: string
  type: 'text' | 'number' | 'hex' | 'boolean' | 'select'
  required?: boolean
  validate?: (value: any) => string | null
  options?: { value: any; label: string }[] // For select type
  placeholder?: string
  rowTypes: ('block' | 'part')[] // Which row types this field applies to
}

interface BlocksDataTableProps extends Omit<DataTableProps<BlockWithAddresses>, 'data'> {
  data: Block[]
  projectId: string
  project?: ScribeProject
  onBuildComplete?: () => void
}

export default function BlocksDataTable({ data, projectId, project, onBuildComplete, columns, ...props }: BlocksDataTableProps) {
  const { user, isAnonymousMode } = useAuthStore()
  const { openPanel } = useArtifactViewerStore()
  const [currentBank, setCurrentBank] = useState<number>(0)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [blockParts, setBlockParts] = useState<{ [blockId: string]: BlockPart[] }>({})
  const [partsLoading, setPartsLoading] = useState(false)
  const [partsError, setPartsError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)

  // Inline editing state
  const [editingCells, setEditingCells] = useState<Set<string>>(new Set()) // Set of "rowId:fieldKey"
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set()) // Set of row IDs with unsaved changes
  const [editingData, setEditingData] = useState<{ [rowId: string]: Record<string, any> }>({}) // Temporary editing values
  const [originalData, setOriginalData] = useState<{ [rowId: string]: GridRow }>({}) // Original values for revert
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({}) // "rowId:fieldKey" -> error message
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set()) // Set of row IDs currently being saved



  // Field configuration for inline editing
  const editableFields: EditableField[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      rowTypes: ['block', 'part'],
      validate: (value: string) => {
        if (!value?.trim()) return 'Name is required'
        if (value.length > 100) return 'Name must be 100 characters or less'
        return null
      }
    },
    {
      key: 'location',
      label: 'Start',
      type: 'hex',
      required: true,
      rowTypes: ['part'],
      placeholder: '1000',
      validate: (value: number) => {
        if (value === null || value === undefined) return 'Start is required'
        if (value < 0 || value > 0xFFFFFF) return 'Start must be between 0x000000 and 0xFFFFFF'
        return null
      }
    },
    {
      key: 'end',
      label: 'End',
      type: 'hex',
      required: true,
      rowTypes: ['part'],
      placeholder: '1C00',
      validate: (value: number) => {
        if (value === null || value === undefined) return 'End is required'
        if (value < 0 || value > 0xFFFFFF) return 'End must be between 0x000000 and 0xFFFFFF'
        return null
      }
    },
    {
      key: 'size',
      label: 'Size',
      type: 'hex',
      required: true,
      rowTypes: ['part'],
      placeholder: '0C00',
      validate: (value: number) => {
        if (!value || value <= 0) return 'Size must be a positive number'
        if (value > 0xFFFF) return 'Size must be 0xFFFF or less'
        return null
      }
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      rowTypes: ['part'],
      options: [
        { value: 'Code', label: 'Code' },
        { value: 'Data', label: 'Data' },
        { value: 'Graphics', label: 'Graphics' },
        { value: 'Audio', label: 'Audio' },
        { value: 'Text', label: 'Text' }
      ],
      validate: (value: string) => {
        if (!value?.trim()) return 'Type is required'
        return null
      }
    },
    {
      key: 'index',
      label: 'Order',
      type: 'number',
      rowTypes: ['part'],
      validate: (value: number) => {
        if (value !== null && value !== undefined && value < 0) return 'Order must be non-negative'
        return null
      }
    },
    {
      key: 'movable',
      label: 'Movable',
      type: 'boolean',
      rowTypes: ['block']
    },
    {
      key: 'group',
      label: 'Group',
      type: 'text',
      rowTypes: ['block']
    },
    {
      key: 'postProcess',
      label: 'Process',
      type: 'text',
      rowTypes: ['block']
    }
  ], [])

  // Build-related state
  const [showRomPathModal, setShowRomPathModal] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildProgress, setBuildProgress] = useState<{ step: string; progress: number; total: number } | null>(null)

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    details?: string[]
    showRetry?: boolean
    retryAction?: () => void
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  })

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

  // Real-time subscriptions for collaborative editing
  useEffect(() => {
    if (!projectId) return

    // Skip realtime subscriptions in anonymous mode or without user
    if (!user || isAnonymousMode) {
      console.log('Skipping BlockPart realtime subscription - no authenticated user')
      return
    }

    // Subscribe to BlockPart changes
    const blockPartsChannel = supabase
      .channel('blockparts-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'BlockPart',
        filter: `blockId=in.(${data.map(block => block.id).join(',')})`
      }, (payload) => {
        const newPart = payload.new as BlockPart
        setBlockParts(prev => {
          const updated = { ...prev }
          if (!updated[newPart.blockId]) {
            updated[newPart.blockId] = []
          }
          // Check if part already exists to avoid duplicates
          const existingIndex = updated[newPart.blockId].findIndex(p => p.id === newPart.id)
          if (existingIndex === -1) {
            updated[newPart.blockId] = [...updated[newPart.blockId], newPart]
            // Sort parts by index
            updated[newPart.blockId].sort((a, b) => {
              const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
              const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
              return indexA - indexB
            })
          }
          return updated
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'BlockPart',
        filter: `blockId=in.(${data.map(block => block.id).join(',')})`
      }, (payload) => {
        const updatedPart = payload.new as BlockPart
        setBlockParts(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(blockId => {
            const partIndex = updated[blockId].findIndex(part => part.id === updatedPart.id)
            if (partIndex !== -1) {
              updated[blockId][partIndex] = updatedPart
              // Re-sort parts by index
              updated[blockId].sort((a, b) => {
                const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
                const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
                return indexA - indexB
              })
            }
          })
          return updated
        })

        // Clear dirty state if this update came from another user
        setDirtyRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(updatedPart.id)
          return newSet
        })

        // Clear editing data for this row
        setEditingData(prev => {
          const newData = { ...prev }
          delete newData[updatedPart.id]
          return newData
        })
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'BlockPart',
        filter: `blockId=in.(${data.map(block => block.id).join(',')})`
      }, (payload) => {
        const deletedPart = payload.old as BlockPart
        setBlockParts(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(blockId => {
            updated[blockId] = updated[blockId].filter(part => part.id !== deletedPart.id)
          })
          return updated
        })

        // Clear any editing state for the deleted part
        setDirtyRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(deletedPart.id)
          return newSet
        })

        setEditingData(prev => {
          const newData = { ...prev }
          delete newData[deletedPart.id]
          return newData
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(blockPartsChannel)
    }
  }, [projectId, data, user, isAnonymousMode])

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

  // Convert blocks and parts to unified grid rows
  const convertToGridRows = useCallback((blocks: BlockWithAddresses[]): GridRow[] => {
    const rows: GridRow[] = []

    blocks.forEach(block => {
      // Add block row
      const blockRow: BlockGridRow = {
        id: block.id,
        rowType: 'block',
        level: 0,
        isExpanded: expandedBlocks.has(block.id),
        isDirty: dirtyRows.has(block.id),
        name: block.name,
        startAddress: block.startAddress,
        endAddress: block.endAddress,
        movable: block.movable,
        group: block.group,
        scene: block.scene,
        postProcess: block.postProcess,
        meta: block.meta,
        projectId: block.projectId,
        createdAt: block.createdAt,
        createdBy: block.createdBy,
        updatedAt: block.updatedAt,
        updatedBy: block.updatedBy,
        deletedAt: block.deletedAt,
        deletedBy: block.deletedBy
      }
      rows.push(blockRow)

      // Add part rows if block is expanded
      if (expandedBlocks.has(block.id)) {
        const parts = blockParts[block.id] || []
        parts.forEach(part => {
          // Calculate end value from location + size
          const calculatedEnd = part.location + part.size

          const partRow: PartGridRow = {
            id: part.id,
            rowType: 'part',
            level: 1,
            parentId: block.id,
            blockId: part.blockId,
            isDirty: dirtyRows.has(part.id),
            name: part.name,
            location: part.location,
            size: part.size,
            end: calculatedEnd,
            type: part.type,
            index: part.index,
            createdAt: part.createdAt,
            createdBy: part.createdBy,
            updatedAt: part.updatedAt,
            updatedBy: part.updatedBy,
            deletedAt: part.deletedAt,
            deletedBy: part.deletedBy
          }
          rows.push(partRow)
        })
      }
    })

    return rows
  }, [blockParts, expandedBlocks, dirtyRows])

  // Inline editing functions
  const startCellEdit = useCallback((rowId: string, fieldKey: string, currentValue: any) => {
    const cellKey = `${rowId}:${fieldKey}`
    setEditingCells(prev => new Set([...prev, cellKey]))

    // Store original value if not already stored
    if (!originalData[rowId]) {
      const currentRow = convertToGridRows(currentBankBlocks).find(row => row.id === rowId)
      if (currentRow) {
        setOriginalData(prev => ({ ...prev, [rowId]: currentRow }))
      }
    }

    // Initialize editing data with current value
    setEditingData(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], [fieldKey]: currentValue }
    }))
  }, [convertToGridRows, currentBankBlocks, originalData])

  const stopCellEdit = useCallback((rowId: string, fieldKey: string) => {
    const cellKey = `${rowId}:${fieldKey}`
    setEditingCells(prev => {
      const newSet = new Set(prev)
      newSet.delete(cellKey)
      return newSet
    })
  }, [])

  const updateCellValue = useCallback((rowId: string, fieldKey: string, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], [fieldKey]: value }
    }))

    // Mark row as dirty
    setDirtyRows(prev => new Set([...prev, rowId]))

    // Clear validation error for this field
    const errorKey = `${rowId}:${fieldKey}`
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[errorKey]
      return newErrors
    })
  }, [])

  // Row state management functions
  const validateRow = useCallback((rowId: string): boolean => {
    const rowData = editingData[rowId]
    if (!rowData) return true

    const errors: Record<string, string> = {}
    const gridRows = convertToGridRows(currentBankBlocks)
    const row = gridRows.find(r => r.id === rowId)
    if (!row) return false

    // Validate each field that has been edited
    Object.keys(rowData).forEach(fieldKey => {
      const field = editableFields.find(f => f.key === fieldKey && f.rowTypes.includes(row.rowType))
      if (field && field.validate) {
        const error = field.validate(rowData[fieldKey])
        if (error) {
          errors[`${rowId}:${fieldKey}`] = error
        }
      }
    })

    setValidationErrors(prev => ({ ...prev, ...errors }))
    return Object.keys(errors).length === 0
  }, [editingData, convertToGridRows, currentBankBlocks, editableFields])

  const saveRow = useCallback(async (rowId: string) => {
    if (!user?.id || !validateRow(rowId)) {
      return false
    }

    const rowData = editingData[rowId]
    if (!rowData) return true

    const gridRows = convertToGridRows(currentBankBlocks)
    const row = gridRows.find(r => r.id === rowId)
    if (!row) return false

    // Set saving state
    setSavingRows(prev => new Set([...prev, rowId]))

    try {
      if (row.rowType === 'block') {
        // Update block - only include fields that were actually edited
        const updates: Record<string, any> = {}
        if ('name' in rowData) updates.name = rowData.name
        if ('movable' in rowData) updates.movable = rowData.movable
        if ('group' in rowData) updates.group = rowData.group
        if ('scene' in rowData) updates.scene = rowData.scene
        if ('postProcess' in rowData) updates.postProcess = rowData.postProcess

        const { error } = await db.blocks.update(rowId, updates, user.id)
        if (error) throw new Error(error.message)

      } else if (row.rowType === 'part') {
        const isNewPart = rowId.startsWith('temp-')

        if (isNewPart) {
          // Create new part in database
          const partData = {
            name: rowData.name?.trim() || '',
            location: rowData.location ?? 0,
            size: rowData.size ?? 0,
            type: rowData.type?.trim() || '',
            index: rowData.index || null,
            blockId: (row as PartGridRow).blockId
          }

          const { data, error } = await db.blockParts.create(partData, user.id)
          if (error) throw new Error(error.message)

          if (data) {
            // Replace temporary part with real part in local state
            setBlockParts(prev => {
              const updated = { ...prev }
              const blockId = (row as PartGridRow).blockId
              if (updated[blockId]) {
                const tempIndex = updated[blockId].findIndex(part => part.id === rowId)
                if (tempIndex !== -1) {
                  updated[blockId][tempIndex] = data
                  // Re-sort parts by index
                  updated[blockId].sort((a, b) => {
                    const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
                    const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
                    return indexA - indexB
                  })
                }
              }
              return updated
            })
          }
        } else {
          // Update existing part - only include fields that were actually edited
          const updates: Record<string, any> = {}
          if ('name' in rowData) updates.name = rowData.name
          if ('location' in rowData) updates.location = rowData.location
          if ('size' in rowData) updates.size = rowData.size
          if ('type' in rowData) updates.type = rowData.type
          if ('index' in rowData) updates.index = rowData.index

          const { error } = await db.blockParts.update(rowId, updates, user.id)
          if (error) throw new Error(error.message)

          // Update local blockParts state
          setBlockParts(prev => {
            const updated = { ...prev }
            Object.keys(updated).forEach(blockId => {
              const partIndex = updated[blockId].findIndex(part => part.id === rowId)
              if (partIndex !== -1) {
                updated[blockId][partIndex] = { ...updated[blockId][partIndex], ...updates }
                // Re-sort parts by index
                updated[blockId].sort((a, b) => {
                  const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
                  const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
                  return indexA - indexB
                })
              }
            })
            return updated
          })
        }
      }

      // Clear dirty state and editing data
      setDirtyRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(rowId)
        return newSet
      })

      setEditingData(prev => {
        const newData = { ...prev }
        delete newData[rowId]
        return newData
      })

      setOriginalData(prev => {
        const newData = { ...prev }
        delete newData[rowId]
        return newData
      })

      // Clear any validation errors for this row
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`${rowId}:`)) {
            delete newErrors[key]
          }
        })
        return newErrors
      })

      return true
    } catch (err) {
      console.error('Error saving row:', err)
      const errorKey = `${rowId}:name` // Show error on name field
      setValidationErrors(prev => ({
        ...prev,
        [errorKey]: err instanceof Error ? err.message : 'Failed to save changes'
      }))
      return false
    } finally {
      // Clear saving state
      setSavingRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(rowId)
        return newSet
      })
    }
  }, [user?.id, validateRow, editingData, convertToGridRows, currentBankBlocks])

  const cancelRow = useCallback((rowId: string) => {
    const isNewPart = rowId.startsWith('temp-')

    if (isNewPart) {
      // Remove temporary part from local state
      setBlockParts(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(blockId => {
          updated[blockId] = updated[blockId].filter(part => part.id !== rowId)
        })
        return updated
      })
    }

    // Revert to original values
    setDirtyRows(prev => {
      const newSet = new Set(prev)
      newSet.delete(rowId)
      return newSet
    })

    setEditingData(prev => {
      const newData = { ...prev }
      delete newData[rowId]
      return newData
    })

    setOriginalData(prev => {
      const newData = { ...prev }
      delete newData[rowId]
      return newData
    })

    // Clear any validation errors for this row
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${rowId}:`)) {
          delete newErrors[key]
        }
      })
      return newErrors
    })

    // Clear any editing cells for this row
    setEditingCells(prev => {
      const newSet = new Set(prev)
      Array.from(newSet).forEach(cellKey => {
        if (cellKey.startsWith(`${rowId}:`)) {
          newSet.delete(cellKey)
        }
      })
      return newSet
    })
  }, [])

  // Keyboard navigation
  const getEditableCells = useCallback((): string[] => {
    const gridRows = convertToGridRows(currentBankBlocks)
    const cells: string[] = []

    gridRows.forEach(row => {
      editableFields.forEach(field => {
        if (field.rowTypes.includes(row.rowType)) {
          cells.push(`${row.id}:${field.key}`)
        }
      })
    })

    return cells
  }, [convertToGridRows, currentBankBlocks, editableFields])

  const navigateToCell = useCallback((direction: 'next' | 'prev', currentCellKey: string) => {
    const cells = getEditableCells()
    const currentIndex = cells.indexOf(currentCellKey)

    if (currentIndex === -1) return

    let nextIndex: number
    if (direction === 'next') {
      nextIndex = currentIndex + 1 >= cells.length ? 0 : currentIndex + 1
    } else {
      nextIndex = currentIndex - 1 < 0 ? cells.length - 1 : currentIndex - 1
    }

    const nextCellKey = cells[nextIndex]
    const [rowId, fieldKey] = nextCellKey.split(':')

    // Focus the next cell
    const cellElement = document.querySelector(`[data-cell-key="${nextCellKey}"]`) as HTMLElement
    if (cellElement) {
      cellElement.focus()

      // If it's not already in edit mode, start editing
      if (!editingCells.has(nextCellKey)) {
        const gridRows = convertToGridRows(currentBankBlocks)
        const row = gridRows.find(r => r.id === rowId)
        if (row) {
          const currentValue = (row as any)[fieldKey]
          startCellEdit(rowId, fieldKey, currentValue)
        }
      }
    }
  }, [getEditableCells, editingCells, convertToGridRows, currentBankBlocks, startCellEdit])

  const handleCellKeyDown = useCallback((event: React.KeyboardEvent, rowId: string, fieldKey: string) => {
    const cellKey = `${rowId}:${fieldKey}`

    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        navigateToCell(event.shiftKey ? 'prev' : 'next', cellKey)
        break

      case 'Enter':
        event.preventDefault()
        // Stop editing this cell and move to next
        stopCellEdit(rowId, fieldKey)
        navigateToCell('next', cellKey)
        break

      case 'Escape':
        event.preventDefault()
        // Cancel editing and revert value
        stopCellEdit(rowId, fieldKey)
        // Revert the specific field value
        setEditingData(prev => {
          const newData = { ...prev }
          if (newData[rowId]) {
            const { [fieldKey]: removed, ...rest } = newData[rowId]
            newData[rowId] = rest
            if (Object.keys(rest).length === 0) {
              delete newData[rowId]
            }
          }
          return newData
        })
        break
    }
  }, [navigateToCell, stopCellEdit])

  // Cell rendering functions
  const renderEditableCell = useCallback((row: GridRow, field: EditableField) => {
    const cellKey = `${row.id}:${field.key}`
    const isEditing = editingCells.has(cellKey)
    const currentValue = editingData[row.id]?.[field.key] ?? (row as any)[field.key]
    const error = validationErrors[cellKey]

    const handleClick = () => {
      if (!isEditing) {
        startCellEdit(row.id, field.key, currentValue)
      }
    }

    const handleBlur = () => {
      stopCellEdit(row.id, field.key)

      // For part rows, calculate dependent fields when location, size, or end changes
      if (row.rowType === 'part') {
        const currentData = editingData[row.id] || {}
        const location = currentData.location ?? (row as PartGridRow).location
        const size = currentData.size ?? (row as PartGridRow).size
        const end = currentData.end ?? (location + size)

        // When size changes, recalculate end = location + size
        if (field.key === 'size' && typeof size === 'number' && typeof location === 'number') {
          const calculatedEnd = location + size
          setEditingData(prev => ({
            ...prev,
            [row.id]: {
              ...prev[row.id],
              end: calculatedEnd
            }
          }))

          // Mark row as dirty if not already
          if (!dirtyRows.has(row.id)) {
            setDirtyRows(prev => new Set([...prev, row.id]))
          }
        }

        // When end changes, recalculate size = end - location
        if (field.key === 'end' && typeof end === 'number' && typeof location === 'number') {
          const calculatedSize = end - location
          if (calculatedSize >= 0) {
            setEditingData(prev => ({
              ...prev,
              [row.id]: {
                ...prev[row.id],
                size: calculatedSize
              }
            }))

            // Mark row as dirty if not already
            if (!dirtyRows.has(row.id)) {
              setDirtyRows(prev => new Set([...prev, row.id]))
            }
          }
        }

        // When location changes, recalculate end = location + size
        if (field.key === 'location' && typeof location === 'number' && typeof size === 'number') {
          const calculatedEnd = location + size
          setEditingData(prev => ({
            ...prev,
            [row.id]: {
              ...prev[row.id],
              end: calculatedEnd
            }
          }))

          // Mark row as dirty if not already
          if (!dirtyRows.has(row.id)) {
            setDirtyRows(prev => new Set([...prev, row.id]))
          }
        }
      }
    }

    const handleChange = (value: any) => {
      updateCellValue(row.id, field.key, value)
    }

    if (isEditing) {
      return (
        <div className="relative">
          {field.type === 'text' && (
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.key)}
              className={clsx(
                'w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2',
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500',
                field.key === 'location' || field.key === 'size' ? 'font-mono' : ''
              )}
              placeholder={field.placeholder}
              autoFocus
              data-cell-key={cellKey}
            />
          )}

          {field.type === 'hex' && (
            <input
              type="text"
              value={typeof currentValue === 'number'
                ? currentValue.toString(16).toUpperCase().padStart(4, '0')
                : currentValue || ''}
              onChange={(e) => {
                const hexValue = e.target.value.replace(/^0x/i, '')
                if (/^[0-9A-Fa-f]*$/.test(hexValue) && hexValue !== '') {
                  handleChange(parseInt(hexValue, 16))
                } else if (hexValue === '') {
                  handleChange(null)
                } else {
                  handleChange(e.target.value) // Keep invalid input for validation
                }
              }}
              onBlur={handleBlur}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.key)}
              className={clsx(
                'w-full px-2 py-1 text-sm box-border border rounded focus:outline-none focus:ring-2 font-mono',
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
              )}
              placeholder={field.placeholder}
              autoFocus
              data-cell-key={cellKey}
            />
          )}

          {field.type === 'number' && (
            <input
              type="number"
              value={currentValue ?? ''}
              onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
              onBlur={handleBlur}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.key)}
              className={clsx(
                'w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2',
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
              )}
              min={0}
              autoFocus
              data-cell-key={cellKey}
            />
          )}

          {field.type === 'boolean' && (
            <select
              value={currentValue ? 'true' : 'false'}
              onChange={(e) => handleChange(e.target.value === 'true')}
              onBlur={handleBlur}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.key)}
              className={clsx(
                'w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2',
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
              )}
              autoFocus
              data-cell-key={cellKey}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          )}

          {field.type === 'select' && (
            <select
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => handleCellKeyDown(e, row.id, field.key)}
              className={clsx(
                'w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2',
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
              )}
              autoFocus
              data-cell-key={cellKey}
            >
              <option value="">Select...</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {error && (
            <div className="absolute top-full left-0 z-10 mt-1 text-xs text-red-600 bg-white border border-red-300 rounded px-2 py-1 shadow-lg">
              {error}
            </div>
          )}
        </div>
      )
    }

    // Display mode
    const displayValue = (() => {
      if (currentValue === null || currentValue === undefined) return '—'

      if (field.type === 'hex' && typeof currentValue === 'number') {
        return (currentValue & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
      }

      if (field.type === 'boolean') {
        return currentValue ? '✓' : '✗'
      }

      return String(currentValue)
    })()

    return (
      <div
        onClick={handleClick}
        className={clsx(
          'cursor-pointer hover:bg-gray-50 rounded',
          (field.key === 'location' || field.key === 'size' || field.key === 'end') ? 'font-mono' : '',
          error && 'bg-red-50'
        )}
        data-cell-key={cellKey}
        tabIndex={0}
      >
        {displayValue}
      </div>
    )
  }, [editingCells, editingData, validationErrors, startCellEdit, stopCellEdit, updateCellValue, handleCellKeyDown])

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



  const handleAddPart = (block: BlockWithAddresses) => {
    if (!user?.id) {
      console.error('User not authenticated')
      return
    }

    // Calculate next location based on existing parts
    const existingParts = blockParts[block.id] || []
    const nextLocation = existingParts.length > 0
      ? Math.max(...existingParts.map(p => p.location + p.size))
      : 0

    // Generate a temporary ID for the new part
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    // Create new part as a temporary object
    const newPart: BlockPart = {
      id: tempId,
      name: '',
      location: nextLocation,
      size: 0,
      type: 'Code',
      index: null,
      blockId: block.id,
      createdAt: new Date(),
      createdBy: user.id,
      updatedAt: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null
    }

    // Add to local state without persisting to database
    setBlockParts(prev => {
      const updated = { ...prev }
      if (!updated[block.id]) {
        updated[block.id] = []
      }
      updated[block.id] = [...updated[block.id], newPart]

      // Sort parts by index
      updated[block.id].sort((a, b) => {
        const indexA = a.index !== null && a.index !== undefined ? a.index : 999999
        const indexB = b.index !== null && b.index !== undefined ? b.index : 999999
        return indexA - indexB
      })

      return updated
    })

    // Mark the new part as dirty
    setDirtyRows(prev => new Set([...prev, tempId]))

    // Initialize editing data with default values (including calculated end)
    setEditingData(prev => ({
      ...prev,
      [tempId]: {
        name: '',
        location: nextLocation,
        size: 0,
        end: nextLocation + 0, // Calculated: location + size
        type: 'Code',
        index: null
      }
    }))

    // Expand the block to show the new part
    setExpandedBlocks(prev => new Set([...prev, block.id]))
  }



  const handleDeletePart = async (partId: string, blockId: string) => {
    if (!user?.id) return

    if (!confirm('Are you sure you want to delete this part?')) {
      return
    }

    try {
      const { error } = await db.blockParts.delete(partId, user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Update local state
      setBlockParts(prev => {
        const updated = { ...prev }
        if (updated[blockId]) {
          updated[blockId] = updated[blockId].filter(part => part.id !== partId)
        }
        return updated
      })
    } catch (err) {
      console.error('Error deleting part:', err)
      alert('Failed to delete part. Please try again.')
    }
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

  // Build functionality
  const handleBuildProject = () => {
    if (!project) {
      console.error('Project not available for build')
      showNotification(
        'error',
        'Project Not Available',
        'Cannot start build process because project data is not available.',
        ['Please refresh the page and try again.']
      )
      return
    }

    if (data.length === 0) {
      showNotification(
        'warning',
        'No Blocks to Build',
        'There are no blocks in this project to build.',
        ['Add some blocks to your project before attempting to build.']
      )
      return
    }

    setShowRomPathModal(true)
  }

  // Notification helpers
  const showNotification = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    details?: string[],
    showRetry?: boolean,
    retryAction?: () => void
  ) => {
    setNotification({
      show: true,
      type,
      title,
      message,
      details,
      showRetry,
      retryAction
    })
  }, [])

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }))
  }

  const handleRomFileConfirm = async (romFile: File, romData: Uint8Array) => {
    if (!project) return

    setIsBuilding(true)
    setBuildProgress({ step: 'Initializing build...', progress: 0, total: 6 })

    try {
      const progressCallback: BuildProgressCallback = (step, progress, total) => {
        setBuildProgress({ step, progress, total })
      }

      const orchestrator = createBuildOrchestrator(project, romFile, romData, progressCallback)
      const result = await orchestrator.build()

      if (result.success) {
        console.log('Build completed successfully:', result.artifacts)
        showNotification(
          'success',
          'Build Completed Successfully',
          `Generated ${result.artifacts.length} assembly artifacts for your blocks.`,
          result.artifacts.map(artifact => `${artifact.blockName}: ${artifact.content.split('\n').length} lines`)
        )
        if (onBuildComplete) {
          onBuildComplete()
        }
      } else {
        console.error('Build failed:', result.errors)
        showNotification(
          'error',
          'Build Failed',
          'The build process encountered errors and could not complete successfully.',
          result.errors,
          true,
          () => handleRomFileConfirm(romFile, romData)
        )
      }
    } catch (error) {
      console.error('Build error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      showNotification(
        'error',
        'Build Error',
        'An unexpected error occurred during the build process.',
        [errorMessage],
        true,
        () => handleRomFileConfirm(romFile, romData)
      )
    } finally {
      setIsBuilding(false)
      setBuildProgress(null)
    }
  }

  const handleRomPathCancel = () => {
    setShowRomPathModal(false)
  }

  // Artifact viewing functionality
  const handleViewArtifact = useCallback((block: Block) => {
    try {
      openPanel(block)
    } catch (error) {
      console.error('Error opening artifact panel:', error)
      showNotification(
        'error',
        'Error Opening Artifact',
        'Failed to open the artifact viewer. Please try again.',
        [error instanceof Error ? error.message : 'Unknown error']
      )
    }
  }, [openPanel, showNotification])

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

      if (col.key === 'name') {
        return {
          ...col,
          render: (value: any, row: BlockWithAddresses) => (
            <div className="flex items-center space-x-2">
              <span className="font-medium">{value}</span>
              <button
                onClick={() => handleViewArtifact(row)}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                title="View build artifact"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          )
        }
      }

      return col
    })
  }, [columns, expandedBlocks, handleViewArtifact])

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

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {currentBankBlocks.length} block{currentBankBlocks.length !== 1 ? 's' : ''} in this bank
            {availableBanks.length > 1 && (
              <span className="ml-2">
                • {availableBanks.length} bank{availableBanks.length !== 1 ? 's' : ''} total
              </span>
            )}
          </div>

          {/* Build Button */}
          {project && (
            <button
              onClick={handleBuildProject}
              disabled={isBuilding || data.length === 0}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Build project and generate assembly code"
            >
              <Hammer className="h-4 w-4 mr-2" />
              {isBuilding ? 'Building...' : 'Build'}
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Data Grid with Inline Editing */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  {/* Expand/Collapse */}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Move<br/>Size
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path<br/>Type
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Process<br/>Order
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {convertToGridRows(currentBankBlocks).map((row, index) => {
                const isDirty = dirtyRows.has(row.id)
                const isSaving = savingRows.has(row.id)
                const isBlock = row.rowType === 'block'
                const isPart = row.rowType === 'part'

                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                      isDirty && 'bg-yellow-50 border-l-4 border-yellow-400',
                      isPart && 'bg-blue-50/30'
                    )}
                  >
                    {/* Expand/Collapse Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isBlock && (
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
                      )}
                      {isPart && (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        </div>
                      )}
                    </td>

                    {/* Name Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {renderEditableCell(row, editableFields.find(f => f.key === 'name')!)}
                    </td>

                    {/* Start Address Column */}
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-right">
                      {isBlock && row.startAddress !== undefined ? (
                        row.startAddress.toString(16).toUpperCase().padStart(6, '0')
                      ) : isPart ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'location')!)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* End Address Column */}
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-right">
                      {isBlock && row.endAddress !== undefined ? (
                        row.endAddress.toString(16).toUpperCase().padStart(6, '0')
                      ) : isPart ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'end')!)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Size/Movable Column */}
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-sm">
                      {isBlock ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'movable')!)
                      ) : isPart ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'size')!)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Group/Type Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isBlock ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'group')!)
                      ) : isPart ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'type')!)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Scene/Order Column */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isBlock ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'postProcess')!)
                      ) : isPart ? (
                        renderEditableCell(row, editableFields.find(f => f.key === 'index')!)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isDirty && (
                          <>
                            <button
                              onClick={() => saveRow(row.id)}
                              disabled={isSaving}
                              className={clsx(
                                "text-green-600 hover:text-green-900",
                                isSaving && "opacity-50 cursor-not-allowed"
                              )}
                              title={isSaving ? "Saving..." : "Save Changes"}
                            >
                              <Check className={clsx("h-4 w-4", isSaving && "animate-pulse")} />
                            </button>
                            <button
                              onClick={() => cancelRow(row.id)}
                              disabled={isSaving}
                              className={clsx(
                                "text-gray-600 hover:text-gray-900",
                                isSaving && "opacity-50 cursor-not-allowed"
                              )}
                              title="Cancel Changes"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {isBlock && (
                          <button
                            onClick={() => handleAddPart(row as BlockWithAddresses)}
                            className="text-green-600 hover:text-green-900"
                            title="Add Part"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}

                        {isPart && (
                          <button
                            onClick={() => handleDeletePart(row.id, (row as PartGridRow).blockId)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Part"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        {isBlock && (
                          <button
                            onClick={() => handleViewArtifact(row as Block)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Artifact"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* <DataTable
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
            <div className="bg-gray-50">
              <div className="overflow-visible">
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
                    {/* Existing Parts *\/}
                    {parts.sort((a, b) => {
                      const orderA = a.index ?? 0;
                      const orderB = b.index ?? 0;
                      if (orderA !== orderB) return orderA - orderB;
                      return a.location - b.location;
                    }).map((part, index) => {
                      const isEditing = editingPartId === part.id
                      return (
                        <tr key={part.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isEditing ? renderEditPartEditableCell('name', 'text') : (
                              <span className="text-sm text-gray-900">{part.name}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isEditing ? renderEditPartEditableCell('location', 'hex') : (
                              <span className="text-sm font-mono text-gray-900">
                                0x{part.location.toString(16).toUpperCase().padStart(6, '0')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isEditing ? renderEditPartEditableCell('size', 'hex') : (
                              <span className="text-sm font-mono text-gray-900">
                                0x{part.size.toString(16).toUpperCase().padStart(4, '0')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                            0x{(part.location + part.size).toString(16).toUpperCase().padStart(6, '0')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isEditing ? renderEditPartEditableCell('type', 'text') : (
                              <span className="text-sm text-gray-900">{part.type}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isEditing ? renderEditPartEditableCell('index', 'number') : (
                              <span className="text-sm text-gray-900">{part.index || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                            {isEditing ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={handleSaveEditPart}
                                  className="text-green-600 hover:text-green-900"
                                  title="Save"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={handleCancelEditPart}
                                  className="text-red-600 hover:text-red-900"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleEditPart(part)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePart(part.id, part.blockId)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Always show Add Form Row at the bottom *\/}
                    <tr className="bg-blue-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderPartEditableCell(block.id, 'name', 'text')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderPartEditableCell(block.id, 'location', 'hex')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderPartEditableCell(block.id, 'size', 'hex')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-400">
                        {/* END address - calculated automatically *\/}
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
                            title="Clear"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        }}
      /> */}

      {/* ROM File Modal */}
      <RomPathModal
        isOpen={showRomPathModal}
        onClose={handleRomPathCancel}
        onConfirm={handleRomFileConfirm}
        title="Build Project"
        description="To build the project and generate assembly code, please select your ROM file."
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.show}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
        showRetry={notification.showRetry}
        onRetry={notification.retryAction}
      />

      {/* Build Progress Display */}
      {isBuilding && buildProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Building Project</h3>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">{buildProgress.step}</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(buildProgress.progress / buildProgress.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {buildProgress.progress}/{buildProgress.total}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Please wait while we analyze your ROM and generate assembly code...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
