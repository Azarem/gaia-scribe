import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { usePlatformPermissions } from '../hooks/usePlatformPermissions'
import { supabase } from '../lib/supabase'
import { db } from '../services/supabase'
import type { InstructionGroup, InstructionCode, AddressingMode } from '@prisma/client'
import DataTable, { type DataTableProps, type ColumnDefinition } from './DataTable'

interface InstructionGroupWithCodes extends InstructionGroup {
  codes?: InstructionCode[]
}

interface InstructionSetsDataTableProps extends Omit<DataTableProps<InstructionGroupWithCodes>, 'data' | 'columns'> {
  platformId: string
  columns: ColumnDefinition<InstructionGroupWithCodes>[]
}

export default function InstructionSetsDataTable({
  platformId,
  columns,
  ...props
}: InstructionSetsDataTableProps) {
  const { user, isAnonymousMode } = useAuthStore()
  const { canManage } = usePlatformPermissions(platformId)
  const [data, setData] = useState<InstructionGroupWithCodes[]>([])
  const [instructionCodes, setInstructionCodes] = useState<{ [groupId: string]: InstructionCode[] }>({})
  const [addressingModes, setAddressingModes] = useState<AddressingMode[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [codesLoading, setCodesLoading] = useState(false)

  // Load instruction groups and addressing modes
  const loadData = useCallback(async () => {
    if (!platformId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [groupsResult, modesResult] = await Promise.all([
        db.instructionGroups.getByPlatform(platformId),
        db.addressingModes.getByPlatform(platformId)
      ])

      if (groupsResult.error) {
        throw new Error(groupsResult.error.message)
      }

      if (modesResult.error) {
        throw new Error(modesResult.error.message)
      }

      setData(groupsResult.data || [])
      setAddressingModes(modesResult.data || [])
    } catch (err) {
      console.error('Error loading instruction groups:', err)
      setError(err instanceof Error ? err.message : 'Failed to load instruction groups')
    } finally {
      setLoading(false)
    }
  }, [platformId])

  // Load instruction codes for expanded groups
  const loadInstructionCodes = useCallback(async (groupId: string) => {
    if (instructionCodes[groupId]) return // Already loaded

    try {
      setCodesLoading(true)
      const { data: codes, error } = await db.instructionCodes.getByGroup(groupId)

      if (error) {
        throw new Error(error.message)
      }

      setInstructionCodes(prev => ({
        ...prev,
        [groupId]: codes || []
      }))
    } catch (err) {
      console.error('Error loading instruction codes:', err)
    } finally {
      setCodesLoading(false)
    }
  }, [instructionCodes])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscriptions
  useEffect(() => {
    if (!platformId) return

    // Skip realtime subscriptions in anonymous mode or without user
    if (!user || isAnonymousMode) {
      console.log('Skipping InstructionGroup/InstructionCode realtime subscriptions - no authenticated user')
      return
    }

    const groupsChannel = supabase
      .channel(`instruction-groups-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'InstructionGroup',
          filter: `platformId=eq.${platformId}`
        },
        (payload) => {
          console.log('InstructionGroup change received:', payload)

          if (payload.eventType === 'INSERT' && payload.new) {
            const newGroup = payload.new as InstructionGroup
            setData(prev => [...prev, newGroup])
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedGroup = payload.new as InstructionGroup
            setData(prev => prev.map(group => 
              group.id === updatedGroup.id ? updatedGroup : group
            ))
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedGroup = payload.old as InstructionGroup
            setData(prev => prev.filter(group => group.id !== deletedGroup.id))
            // Clean up codes for deleted group
            setInstructionCodes(prev => {
              const updated = { ...prev }
              delete updated[deletedGroup.id]
              return updated
            })
          }
        }
      )
      .subscribe()

    const codesChannel = supabase
      .channel(`instruction-codes-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'InstructionCode'
        },
        (payload) => {
          console.log('InstructionCode change received:', payload)

          if (payload.eventType === 'INSERT' && payload.new) {
            const newCode = payload.new as InstructionCode
            setInstructionCodes(prev => ({
              ...prev,
              [newCode.groupId]: [...(prev[newCode.groupId] || []), newCode]
            }))
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedCode = payload.new as InstructionCode
            setInstructionCodes(prev => ({
              ...prev,
              [updatedCode.groupId]: (prev[updatedCode.groupId] || []).map(code =>
                code.id === updatedCode.id ? updatedCode : code
              )
            }))
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedCode = payload.old as InstructionCode
            setInstructionCodes(prev => ({
              ...prev,
              [deletedCode.groupId]: (prev[deletedCode.groupId] || []).filter(code =>
                code.id !== deletedCode.id
              )
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(groupsChannel)
      supabase.removeChannel(codesChannel)
    }
  }, [platformId, user, isAnonymousMode])

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
        // Load codes when expanding
        loadInstructionCodes(groupId)
      }
      return newSet
    })
  }

  // Enhanced columns with expand functionality
  const enhancedColumns = useMemo(() => {
    return columns.map(col => {
      if (col.key === 'expand') {
        return {
          ...col,
          render: (_value: any, row: InstructionGroupWithCodes) => (
            <button
              onClick={() => toggleGroupExpansion(row.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title={expandedGroups.has(row.id) ? 'Collapse' : 'Expand'}
            >
              {expandedGroups.has(row.id) ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )
        }
      }

      return col
    })
  }, [columns, expandedGroups])

  // CRUD operations for groups
  const handleAdd = async (newItem: Partial<InstructionGroup>) => {
    if (!user?.id) throw new Error('User not authenticated')

    const groupData = {
      name: newItem.name || '',
      meta: newItem.meta,
      platformId
    }

    const { data: created, error } = await db.instructionGroups.create(groupData, user.id)

    if (error) {
      throw new Error(error.message)
    }

    return created
  }

  const handleEdit = async (id: string, updates: Partial<InstructionGroup>) => {
    if (!user?.id) throw new Error('User not authenticated')

    const { data: updated, error } = await db.instructionGroups.update(id, updates, user.id)

    if (error) {
      throw new Error(error.message)
    }

    return updated
  }

  const handleDelete = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated')

    const { error } = await db.instructionGroups.delete(id, user.id)

    if (error) {
      throw new Error(error.message)
    }
  }

  const handleRefresh = () => {
    loadData()
    setInstructionCodes({}) // Clear codes cache
    setExpandedGroups(new Set()) // Collapse all
  }

  // Create instruction codes sub-table component
  const renderInstructionCodesTable = (group: InstructionGroupWithCodes) => {
    const codes = instructionCodes[group.id] || []

    // CRUD handlers for instruction codes
    const handleAddCode = async (newCode: Partial<InstructionCode>) => {
      if (!user?.id) throw new Error('User not authenticated')

      const codeData = {
        code: newCode.code || 0,
        cycles: newCode.cycles || 1,
        modeId: newCode.modeId,
        meta: newCode.meta,
        groupId: group.id
      }

      const { data: created, error } = await db.instructionCodes.create(codeData, user.id)

      if (error) {
        throw new Error(error.message)
      }

      return created
    }

    const handleEditCode = async (id: string, updates: Partial<InstructionCode>) => {
      if (!user?.id) throw new Error('User not authenticated')

      // Clean updates to match expected type
      const cleanUpdates = {
        code: updates.code,
        cycles: updates.cycles || undefined,
        modeId: updates.modeId,
        meta: updates.meta,
        groupId: updates.groupId
      }

      const { data: updated, error } = await db.instructionCodes.update(id, cleanUpdates, user.id)

      if (error) {
        throw new Error(error.message)
      }

      return updated
    }

    const handleDeleteCode = async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await db.instructionCodes.delete(id, user.id)

      if (error) {
        throw new Error(error.message)
      }
    }

    const codeColumns: ColumnDefinition<InstructionCode>[] = [
      {
        key: 'code',
        label: 'Code',
        sortable: true,
        editable: true,
        type: 'number',
        render: (value) => `0x${value.toString(16).toUpperCase().padStart(2, '0')}`
      },
      {
        key: 'cycles',
        label: 'Cycles',
        sortable: true,
        editable: true,
        type: 'number'
      },
      {
        key: 'modeId',
        label: 'Mode',
        sortable: true,
        editable: true,
        type: 'select',
        options: addressingModes.map(mode => ({ value: mode.id, label: mode.name })),
        render: (value) => {
          const mode = addressingModes.find(m => m.id === value)
          return mode ? mode.name : 'Unknown'
        }
      }
    ]

    return (
      <div className="px-6 py-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-3">Instruction Codes for {group.name}:</div>
        <DataTable
          data={codes}
          columns={codeColumns}
          loading={codesLoading}
          onAdd={canManage ? handleAddCode : undefined}
          onEdit={canManage ? handleEditCode : undefined}
          onDelete={canManage ? handleDeleteCode : undefined}
          searchPlaceholder="Search instruction codes..."
          addButtonText="Add Instruction Code"
          emptyMessage="No instruction codes defined for this group."
          className="bg-white"
        />
      </div>
    )
  }

  return (
    <DataTable
      {...props}
      data={data}
      columns={enhancedColumns}
      loading={loading}
      error={error}
      onAdd={canManage ? handleAdd : undefined}
      onEdit={canManage ? handleEdit : undefined}
      onDelete={canManage ? handleDelete : undefined}
      onRefresh={handleRefresh}
      expandedRows={expandedGroups}
      renderExpandedContent={renderInstructionCodesTable}
    />
  )
}
