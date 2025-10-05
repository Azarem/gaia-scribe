import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Check, X, Trash2, Hammer, Eye, Plus } from 'lucide-react'
import DataTable, { type DataTableProps } from './DataTable'
import { useAuthStore } from '../stores/auth-store'
import { useArtifactViewerStore } from '../stores/artifact-viewer-store'
import { supabase } from '../lib/supabase'
import { db } from '../services/supabase'
import type { Block, BlockPart, ScribeProject } from '@prisma/client'
import clsx from 'clsx'
import RomPathModal from './RomPathModal'
import NotificationModal from './NotificationModal'
import { createBuildOrchestrator, type BuildProgressCallback } from '../lib/build-orchestrator'
import { sortBlockPartsInPlace } from '../lib/sort-utils'

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
  type: 'text' | 'number' | 'hex' | 'boolean' | 'select' | 'autocomplete'
  required?: boolean
  validate?: (value: any) => string | null
  options?: { id: string; name: string }[] // For select and autocomplete types
  placeholder?: string
  rowTypes: ('block' | 'part')[] // Which row types this field applies to
}

interface BlocksDataTableProps extends Omit<DataTableProps<BlockWithAddresses>, 'data'> {
  //data: Block[]
  projectId: string
  project?: ScribeProject
  onBuildComplete?: () => void
}

export default function BlocksDataTable({ projectId, project, onBuildComplete, columns, ...props }: BlocksDataTableProps) {
  const { user, isAnonymousMode } = useAuthStore()
  const { openPanel } = useArtifactViewerStore()
  const [currentBank, setCurrentBank] = useState<number>(0)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [blocksWithAddresses, setBlocksWithAddresses] = useState<BlockWithAddresses[]>([])
  const [partsLoading, setPartsLoading] = useState(false)
  const [partsError, setPartsError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)
  const [typeList, setTypeList] = useState<{ id: string; name: string }[]>([])

  // Inline editing state
  const [editingCells, setEditingCells] = useState<Set<string>>(new Set()) // Set of "rowId:fieldKey"
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set()) // Set of row IDs with unsaved changes
  const [editingData, setEditingData] = useState<{ [rowId: string]: Record<string, any> }>({}) // Temporary editing values
  const [originalData, setOriginalData] = useState<{ [rowId: string]: GridRow }>({}) // Original values for revert
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({}) // "rowId:fieldKey" -> error message
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set()) // Set of row IDs currently being saved

  // Autocomplete state
  const [autocompleteOpen, setAutocompleteOpen] = useState<Set<string>>(new Set()) // Set of "rowId:fieldKey" with open dropdowns
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState<{ [key: string]: number }>({}) // "rowId:fieldKey" -> selected index


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
      type: 'autocomplete',
      required: true,
      rowTypes: ['part'],
      options: typeList,
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
  ], [typeList])

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

  const handlePartChange = (block: BlockWithAddresses) => {
    if (block.parts) {
      block.startAddress = Math.min(...block.parts.map(part => part.location))
      block.endAddress = Math.max(...block.parts.map(part => part.location + part.size))
      sortBlockPartsInPlace(block.parts)
    }
  }

  // Fetch all BlockParts for the project
  useEffect(() => {
    if (!projectId) {
      setDataReady(true) // No blocks means we're ready (empty state)
      return
    }

    const fetchBlocksAndParts = async () => {
      setPartsLoading(true)
      setPartsError(null)
      setDataReady(false)

      try {
        const { data: blocks, error: blocksError } = await db.blocks.getByProject(projectId)
        const { data: parts, error } = await db.blockParts.getByProject(projectId)

        if (error || blocksError) {
          console.error('Error fetching block parts:', error || blocksError)
          setPartsError('Failed to load block parts')
          setDataReady(true) // Set ready even on error to prevent infinite loading
          return
        }

        const { data: stringTypes, error: stringTypesError } = await db.stringTypes.getByProject(projectId)
        const { data: structs, error: structsError } = await db.structs.getByProject(projectId)
        const { data: platformTypes, error: platformTypesError } = await db.platformTypes.getByPlatform(project?.platformId || '')

        const newTypeList: { id: string; name: string }[] = []
        stringTypes?.forEach(stringType => {
          newTypeList.push({ id: stringType.id, name: stringType.name })
        })
        structs?.forEach(struct => {
          newTypeList.push({ id: struct.id, name: struct.name })
        })
        platformTypes?.forEach(platformType => {
          newTypeList.push({ id: platformType.id, name: platformType.name })
        })
        newTypeList.sort((a, b) => a.name.localeCompare(b.name))
        setTypeList(newTypeList)

        // Initialize block lookup
        const partsByBlock: { [blockId: string]: BlockPart[] } = {}
        parts?.forEach(part => {
          if (!partsByBlock[part.blockId]) {
            partsByBlock[part.blockId] = []
          }
          partsByBlock[part.blockId].push(part)
        })

        var blocksWithParts = blocks.map(block => {
          const parts = partsByBlock[block.id]
          return {
            ...block,
            parts: sortBlockPartsInPlace(parts),
            startAddress: Math.min(...parts.map(part => part.location)),
            endAddress: Math.max(...parts.map(part => part.location + part.size))
          }
        })

        setBlocksWithAddresses(blocksWithParts)
        setDataReady(true)
      } catch (err) {
        console.error('Error fetching block parts:', err)
        setPartsError('Failed to load block parts')
        setDataReady(true)
      } finally {
        setPartsLoading(false)
      }
    }

    fetchBlocksAndParts()
  }, [projectId])

  // Real-time subscriptions for collaborative editing
  useEffect(() => {
    if (!projectId) return

    // Skip realtime subscriptions in anonymous mode or without user
    if (!user || isAnonymousMode) {
      console.log('Skipping BlockPart realtime subscription - no authenticated user')
      return
    }

    // React 19 best practice: Use ignore flag to prevent race conditions
    // This prevents stale event handlers from updating state after cleanup
    // Especially important with React Strict Mode's double-invocation in development
    let ignore = false

    // Subscribe to BlockPart changes for this project
    // Note: We subscribe to all BlockPart changes for the project, not filtered by blockId
    // This prevents subscription recreation when blocks change
    const blockPartsChannel = supabase
      .channel(`blockparts-changes-${Date.now()}`) // Unique channel name to prevent conflicts
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'BlockPart'
      }, (payload) => {
        if (ignore) return // Prevent stale handler execution

        const newPart = payload.new as BlockPart
        setBlocksWithAddresses(prev => 
          prev.map(block => {
            if (block.id === newPart.blockId) {
              // Check if part already exists to prevent duplicates
              const partExists = block.parts?.some(p => p.id === newPart.id)
              if (partExists) return block

              // Create new block with new parts array (immutable update)
              const updatedBlock = {
                ...block,
                parts: [...(block.parts || []), newPart]
              }
              handlePartChange(updatedBlock)
              return updatedBlock
            }
            return block
          })
        )
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'BlockPart'
      }, (payload) => {
        if (ignore) return // Prevent stale handler execution

        const updatedPart = payload.new as BlockPart
        setBlocksWithAddresses(prev => 
          prev.map(block => {
            if (block.id === updatedPart.blockId && block.parts) {
              const partIndex = block.parts.findIndex(part => part.id === updatedPart.id)
              if (partIndex !== -1) {
                // Create new parts array with updated part (immutable update)
                const newParts = [...block.parts]
                newParts[partIndex] = updatedPart
                const updatedBlock = {
                  ...block,
                  parts: newParts
                }
                handlePartChange(updatedBlock)
                return updatedBlock
              }
            }
            return block
          })
        )

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
        table: 'BlockPart'
      }, (payload) => {
        if (ignore) return // Prevent stale handler execution

        const deletedPart = payload.old as BlockPart
        setBlocksWithAddresses(prev => 
          prev.map(block => {
            if (block.id === deletedPart.blockId && block.parts) {
              // Create new parts array without deleted part (immutable update)
              const updatedBlock = {
                ...block,
                parts: block.parts.filter(part => part.id !== deletedPart.id)
              }
              handlePartChange(updatedBlock)
              return updatedBlock
            }
            return block
          })
        )

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
      // Set ignore flag BEFORE cleanup to prevent any queued events from executing
      ignore = true
      supabase.removeChannel(blockPartsChannel)
    }
    // CRITICAL: Do NOT include blocksWithAddresses or setBlocksWithAddresses in dependencies
    // Including blocksWithAddresses causes subscription recreation every time state updates,
    // leading to duplicate event processing and double-triggering
  }, [projectId, user, isAnonymousMode])

  // Calculate addresses and group blocks by memory bank
  // const blocksWithAddresses = useMemo(() => {
  //   // Only calculate addresses when data is ready
  //   if (!blocks || !blocks.length) return []

  //   return blocks.map(block => {
  //     const parts = block.parts
  //     let startAddress: number | undefined
  //     let endAddress: number | undefined

  //     if (parts.length > 0) {
  //       // Parts are already sorted when assigned to blockParts, no need to sort again
  //       // Calculate START as minimum location
  //       const locations = parts
  //         .map(part => part.location)
  //         .filter(loc => loc !== null && loc !== undefined)

  //       // Calculate END as maximum (location + size)
  //       const endAddresses = parts
  //         .map(part => part.location + part.size)
  //         .filter(addr => !isNaN(addr))

  //       if (locations.length > 0) {
  //         startAddress = Math.min(...locations)
  //       }

  //       if (endAddresses.length > 0) {
  //         endAddress = Math.max(...endAddresses)
  //       }

  //     }

  //     return {
  //       ...block,
  //       startAddress,
  //       endAddress,
  //       parts
  //     }
  //   })
  // }, [blocks])

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

  // Cache grid rows - only recompute when dependencies change
  // This eliminates the performance issue of converting data on every render
  const gridRows = useMemo((): GridRow[] => {
    const rows: GridRow[] = []

    currentBankBlocks.forEach(block => {
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
        const parts = block.parts || []
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
  }, [currentBankBlocks, expandedBlocks, dirtyRows])

  // Inline editing functions
  const startCellEdit = useCallback((rowId: string, fieldKey: string, currentValue: any) => {
    const cellKey = `${rowId}:${fieldKey}`
    setEditingCells(prev => new Set([...prev, cellKey]))

    // Store original value if not already stored
    // CRITICAL: Only store original data once per row to preserve the true original state
    // We must capture the CURRENT state of the row including any calculated values from editingData
    // If we already have originalData for this row, don't overwrite it
    setOriginalData(prev => {
      if (prev[rowId]) {
        return prev // Already have original data, don't overwrite
      }

      // CRITICAL FIX: Build the original data from the CURRENT state, not from stale gridRows
      // This ensures we capture calculated values (like size = end - location) that exist in editingData
      const currentRow = gridRows.find(row => row.id === rowId)
      if (currentRow) {
        // Merge the current row with any existing editingData to capture calculated values
        const currentEditedData = editingData[rowId] || {}
        const mergedRow = { ...currentRow, ...currentEditedData }
        return { ...prev, [rowId]: mergedRow }
      }
      return prev
    })

    // Initialize editing data with current value
    // CRITICAL: Use the currentValue parameter which already prefers editingData over row data
    setEditingData(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], [fieldKey]: currentValue }
    }))
  }, [gridRows, editingData])

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
  }, [editingData, gridRows, editableFields])

  const saveRow = useCallback(async (rowId: string) => {
    if (!user?.id || !validateRow(rowId)) {
      return false
    }

    const rowData = editingData[rowId]
    if (!rowData) return true

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
            // Replace temporary part with real part in local state (immutable update)
            setBlocksWithAddresses(prev => {
              const blockId = (row as PartGridRow).blockId
              return prev.map(block => {
                if (block.id === blockId && block.parts) {
                  const tempIndex = block.parts.findIndex(part => part.id === rowId)
                  if (tempIndex !== -1) {
                    // Create new parts array with replaced part (immutable update)
                    const newParts = [...block.parts]
                    newParts[tempIndex] = data
                    const updatedBlock = {
                      ...block,
                      parts: newParts
                    }
                    // Re-sort parts after replacing temporary part
                    handlePartChange(updatedBlock)
                    return updatedBlock
                  }
                }
                return block
              })
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

          // Update local blockParts state (immutable update)
          setBlocksWithAddresses(prev => {
            const blockId = (row as PartGridRow).blockId
            return prev.map(block => {
              if (block.id === blockId && block.parts) {
                const partIndex = block.parts.findIndex(part => part.id === rowId)
                if (partIndex !== -1) {
                  // Create new parts array with updated part (immutable update)
                  const newParts = [...block.parts]
                  newParts[partIndex] = { ...block.parts[partIndex], ...updates }
                  const updatedBlock = {
                    ...block,
                    parts: newParts
                  }
                  // Re-sort parts after update (index or location may have changed)
                  handlePartChange(updatedBlock)
                  return updatedBlock
                }
              }
              return block
            })
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
  }, [user?.id, validateRow, editingData, gridRows])

  const cancelRow = useCallback((rowId: string, blockId: string) => {
    const isNewPart = rowId.startsWith('temp-')

    if (isNewPart) {
      // Remove temporary part from local state (immutable update)
      setBlocksWithAddresses(prev => {
        return prev.map(block => {
          if (block.id === blockId && block.parts) {
            // Create new block with filtered parts array (immutable update)
            const updatedBlock = {
              ...block,
              parts: block.parts.filter(part => part.id !== rowId)
            }
            handlePartChange(updatedBlock)
            return updatedBlock
          }
          return block
        })
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
    const cells: string[] = []

    gridRows.forEach(row => {
      editableFields.forEach(field => {
        if (field.rowTypes.includes(row.rowType)) {
          cells.push(`${row.id}:${field.key}`)
        }
      })
    })

    return cells
  }, [gridRows, editableFields])

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
        const row = editingData[rowId] ?? gridRows.find(r => r.id === rowId)
        if (row) {
          const currentValue = (row as any)[fieldKey]
          startCellEdit(rowId, fieldKey, currentValue)
        }
      }
    }
  }, [getEditableCells, editingCells, gridRows, editingData, startCellEdit])

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

  // Helper functions for autocomplete
  const extractAlphanumericPortion = useCallback((value: string): string => {
    // Remove leading pointer markers (*, &, etc.) to get the alphanumeric portion
    return value.replace(/^[*&]+/, '')
  }, [])

  const getFilteredOptions = useCallback((inputValue: string, options: { id: string; name: string }[]): { id: string; name: string }[] => {
    if (!inputValue) return options

    // Extract alphanumeric portion (ignore leading pointer markers)
    const searchText = extractAlphanumericPortion(inputValue).toLowerCase()

    // Filter options based on alphanumeric portion
    return options.filter(opt => opt.name.toLowerCase().includes(searchText))
  }, [extractAlphanumericPortion])

  // Cell rendering functions
  const renderEditableCell = useCallback((row: GridRow, field: EditableField) => {
    const cellKey = `${row.id}:${field.key}`
    const isEditing = editingCells.has(cellKey)
    // CRITICAL: Always prefer editingData over row data to preserve unsaved changes
    // This ensures that when gridRows is recalculated (which happens on every dirtyRows change),
    // we don't lose the user's edits by falling back to stale row data
    const currentValue = editingData[row.id]?.[field.key] ?? (row as any)[field.key]
    const error = validationErrors[cellKey]

    const handleClick = () => {
      if (!isEditing) {
        // Use currentValue which already prefers editingData over row data
        startCellEdit(row.id, field.key, currentValue)
      }
    }

    const handleBlur = () => {
      stopCellEdit(row.id, field.key)
    }

    const handleChange = (value: any) => {
      // First update the field being edited
      updateCellValue(row.id, field.key, value)

      // For part rows, calculate dependent fields immediately on change
      if (row.rowType === 'part') {
        // CRITICAL: Use editingData for calculations, not row data
        // This ensures we use the latest edited values, not stale database values
        const currentData = editingData[row.id] || {}

        // When location changes, recalculate end = location + size
        if (field.key === 'location') {
          const size = currentData.size ?? (row as PartGridRow).size
          if (typeof value === 'number' && typeof size === 'number') {
            updateCellValue(row.id, 'end', value + size)
          }
        }

        // When size changes, recalculate end = location + size
        if (field.key === 'size') {
          const location = currentData.location ?? (row as PartGridRow).location
          if (typeof value === 'number' && typeof location === 'number') {
            updateCellValue(row.id, 'end', location + value)
          }
        }

        // When end changes, recalculate size = end - location
        if (field.key === 'end') {
          const location = currentData.location ?? (row as PartGridRow).location
          if (typeof value === 'number' && typeof location === 'number') {
            const calculatedSize = value - location
            if (calculatedSize >= 0) {
              updateCellValue(row.id, 'size', calculatedSize)
            }
          }
        }
      }
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
                ? currentValue.toString(16).toUpperCase().padStart(field.key === 'size' ? 4 : 6, '0')
                : currentValue || ''}
              onChange={(e) => {
                const hexValue = e.target.value.replace(/[^0-9A-Fa-f]/g, '')
                if (hexValue !== '') handleChange(parseInt(hexValue, 16))
                else handleChange(null)
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
              {field.options && field.options.map(option => (
                <option key={option.id} value={option.id} selected={option.id === currentValue || option.name === currentValue}>
                  {option.name}
                </option>
              ))}
            </select>
          )}

          {field.type === 'autocomplete' && (() => {
            const isDropdownOpen = autocompleteOpen.has(cellKey)
            const filteredOptions = getFilteredOptions(currentValue || '', field.options || [])
            const selectedIndex = autocompleteSelectedIndex[cellKey] ?? 0

            const handleAutocompleteKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setAutocompleteSelectedIndex(prev => ({
                  ...prev,
                  [cellKey]: Math.min((prev[cellKey] ?? 0) + 1, filteredOptions.length - 1)
                }))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setAutocompleteSelectedIndex(prev => ({
                  ...prev,
                  [cellKey]: Math.max((prev[cellKey] ?? 0) - 1, 0)
                }))
              } else if (e.key === 'Enter' && isDropdownOpen && filteredOptions.length > 0) {
                e.preventDefault()
                const selected = filteredOptions[selectedIndex]
                if (selected) {
                  // Preserve pointer markers from current value
                  const pointerMarkers = (currentValue || '').match(/^[*&]+/)?.[0] || ''
                  handleChange(pointerMarkers + selected.name)
                  setAutocompleteOpen(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(cellKey)
                    return newSet
                  })
                }
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setAutocompleteOpen(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(cellKey)
                  return newSet
                })
              } else {
                handleCellKeyDown(e, row.id, field.key)
              }
            }

            const handleAutocompleteFocus = () => {
              setAutocompleteOpen(prev => new Set([...prev, cellKey]))
              setAutocompleteSelectedIndex(prev => ({ ...prev, [cellKey]: 0 }))
            }

            const handleAutocompleteBlur = () => {
              // Delay to allow click events to fire
              setTimeout(() => {
                setAutocompleteOpen(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(cellKey)
                  return newSet
                })
                handleBlur()
              }, 200)
            }

            const handleOptionClick = (option: { id: string; name: string }) => {
              // Preserve pointer markers from current value
              const pointerMarkers = (currentValue || '').match(/^[*&]+/)?.[0] || ''
              handleChange(pointerMarkers + option.name)
              setAutocompleteOpen(prev => {
                const newSet = new Set(prev)
                newSet.delete(cellKey)
                return newSet
              })
            }

            return (
              <div className="relative">
                <input
                  type="text"
                  value={currentValue || ''}
                  onChange={(e) => {
                    handleChange(e.target.value)
                    setAutocompleteOpen(prev => new Set([...prev, cellKey]))
                    setAutocompleteSelectedIndex(prev => ({ ...prev, [cellKey]: 0 }))
                  }}
                  onFocus={handleAutocompleteFocus}
                  onBlur={handleAutocompleteBlur}
                  onKeyDown={handleAutocompleteKeyDown}
                  className={clsx(
                    'w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2',
                    error
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                  )}
                  placeholder={field.placeholder || 'Type to search...'}
                  autoFocus
                  data-cell-key={cellKey}
                  role="combobox"
                  aria-expanded={isDropdownOpen}
                  aria-autocomplete="list"
                  aria-controls={`${cellKey}-listbox`}
                />

                {isDropdownOpen && filteredOptions.length > 0 && (
                  <div
                    id={`${cellKey}-listbox`}
                    role="listbox"
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredOptions.map((option, index) => (
                      <div
                        key={option.id}
                        role="option"
                        aria-selected={index === selectedIndex}
                        onClick={() => handleOptionClick(option)}
                        onMouseEnter={() => setAutocompleteSelectedIndex(prev => ({ ...prev, [cellKey]: index }))}
                        className={clsx(
                          'px-3 py-2 cursor-pointer text-sm',
                          index === selectedIndex
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-gray-100'
                        )}
                      >
                        {option.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

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
      if (currentValue === null || currentValue === undefined || currentValue === '') return '—'

      if (field.type === 'hex' && typeof currentValue === 'number') {
        return currentValue.toString(16).toUpperCase().padStart(6, '0')
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
          'cursor-pointer hover:bg-gray-50 rounded w-full inline-block',
          (field.key === 'location' || field.key === 'size' || field.key === 'end') ? 'font-mono' : '',
          error && 'bg-red-50'
        )}
        data-cell-key={cellKey}
        tabIndex={0}
      >
        {displayValue}
      </div>
    )
  }, [editingCells, editingData, validationErrors, startCellEdit, stopCellEdit, updateCellValue, handleCellKeyDown, autocompleteOpen, autocompleteSelectedIndex, getFilteredOptions])

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



  const handleAddPart = useCallback((blockId: string) => {
    if (!user?.id) {
      console.error('User not authenticated')
      return
    }

    const block = blocksWithAddresses.find(block => block.id === blockId)
    if (!block) {
      console.error('Block not found')
      return
    }

    // Calculate next location based on existing parts
    const existingParts = block.parts || []
    const nextLocation = existingParts.length > 0
      ? Math.max(...existingParts.map(p => p.location + p.size))
      : 0

    // Calculate next part index for naming (hexadecimal format)
    const partName = `part_${nextLocation.toString(16).toUpperCase().padStart(6, '0')}`

    // Generate a temporary ID for the new part
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    // Create new part as a temporary object
    const newPart: BlockPart = {
      id: tempId,
      name: partName,
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

    // Add to local state without persisting to database (immutable update)
    setBlocksWithAddresses(prev => {
      return prev.map(block => {
        if (block.id === blockId) {
          // Create new block with new parts array (immutable update)
          const updatedBlock = {
            ...block,
            parts: [...(block.parts || []), newPart]
          }
          handlePartChange(updatedBlock)
          return updatedBlock
        }
        return block
      })
    })

    // Mark the new part as dirty
    setDirtyRows(prev => new Set([...prev, tempId]))

    // Initialize editing data with default values (including calculated end)
    setEditingData(prev => ({
      ...prev,
      [tempId]: {
        name: partName,
        location: nextLocation,
        size: 0,
        end: nextLocation + 0, // Calculated: location + size
        type: 'Code',
        index: null
      }
    }))

    // Expand the block to show the new part
    setExpandedBlocks(prev => new Set([...prev, block.id]))

    // Auto-focus the "end" field after the part is rendered
    setTimeout(() => {
      const endCellKey = `${tempId}:end`
      const endCell = document.querySelector(`[data-cell-key="${endCellKey}"]`) as HTMLElement
      if (endCell) {
        endCell.click() // Trigger edit mode
      }
    }, 100)
  }, [blocksWithAddresses, user, handlePartChange])



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

      // Update local state (immutable update)
      setBlocksWithAddresses(prev => {
        return prev.map(block => {
          if (block.id === blockId && block.parts) {
            // Create new block with filtered parts array (immutable update)
            const updatedBlock = {
              ...block,
              parts: block.parts.filter(part => part.id !== partId)
            }
            handlePartChange(updatedBlock)
            return updatedBlock
          }
          return block
        })
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

    if (blocksWithAddresses.length === 0) {
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
              disabled={isBuilding || blocksWithAddresses.length === 0}
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
              {gridRows.map((row, index) => {
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
                              onClick={() => cancelRow(row.id, (row as PartGridRow).blockId)}
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
                            onClick={() => handleAddPart((row as BlockGridRow).id)}
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
