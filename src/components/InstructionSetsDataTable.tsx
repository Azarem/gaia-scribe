import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { db, supabase } from '../lib/supabase'
import type { InstructionGroup, InstructionCode } from '@prisma/client'
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
  const { user } = useAuthStore()
  const [data, setData] = useState<InstructionGroupWithCodes[]>([])
  const [instructionCodes, setInstructionCodes] = useState<{ [groupId: string]: InstructionCode[] }>({})
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [codesLoading, setCodesLoading] = useState(false)

  // Load instruction groups
  const loadData = useCallback(async () => {
    if (!platformId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const groupsResult = await db.instructionGroups.getByPlatform(platformId)

      if (groupsResult.error) {
        throw new Error(groupsResult.error.message)
      }

      setData(groupsResult.data || [])
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
  }, [platformId])

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

  return (
    <DataTable
      {...props}
      data={data}
      columns={enhancedColumns}
      loading={loading}
      error={error}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      expandedRows={expandedGroups}
      renderExpandedContent={(group: InstructionGroupWithCodes) => {
        const codes = instructionCodes[group.id] || []

        return (
          <div className="px-6 py-2 bg-gray-50">
            <div className="text-sm font-medium text-gray-700 mb-3">Instruction Codes:</div>
            {codesLoading ? (
              <div className="text-sm text-gray-500">Loading codes...</div>
            ) : codes.length === 0 ? (
              <div className="text-sm text-gray-500">No instruction codes defined for this group.</div>
            ) : (
              <div className="space-y-2">
                {codes.map((code) => (
                  <div key={code.id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="flex items-center space-x-4">
                      <span className="font-mono text-sm">0x{code.code.toString(16).toUpperCase().padStart(2, '0')}</span>
                      <span className="text-sm text-gray-600">
                        {code.cycles ? `${code.cycles} cycles` : 'Variable cycles'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
