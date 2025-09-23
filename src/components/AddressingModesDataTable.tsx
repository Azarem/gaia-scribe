import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { db, supabase } from '../lib/supabase'
import type { AddressingMode } from '@prisma/client'
import DataTable, { type DataTableProps, type ColumnDefinition } from './DataTable'

interface AddressingModesDataTableProps extends Omit<DataTableProps<AddressingMode>, 'data' | 'columns'> {
  platformId: string
  columns: ColumnDefinition<AddressingMode>[]
}

export default function AddressingModesDataTable({ 
  platformId, 
  columns, 
  ...props 
}: AddressingModesDataTableProps) {
  const { user } = useAuthStore()
  const [data, setData] = useState<AddressingMode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load addressing modes for the platform
  const loadData = useCallback(async () => {
    if (!platformId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: addressingModes, error: fetchError } = await db.addressingModes.getByPlatform(platformId)

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setData(addressingModes || [])
    } catch (err) {
      console.error('Error loading addressing modes:', err)
      setError(err instanceof Error ? err.message : 'Failed to load addressing modes')
    } finally {
      setLoading(false)
    }
  }, [platformId])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscription
  useEffect(() => {
    if (!platformId) return

    const channel = supabase
      .channel(`addressing-modes-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'AddressingMode',
          filter: `platformId=eq.${platformId}`
        },
        (payload) => {
          console.log('AddressingMode change received:', payload)

          if (payload.eventType === 'INSERT' && payload.new) {
            const newMode = payload.new as AddressingMode
            setData(prev => [...prev, newMode])
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedMode = payload.new as AddressingMode
            setData(prev => prev.map(mode => 
              mode.id === updatedMode.id ? updatedMode : mode
            ))
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedMode = payload.old as AddressingMode
            setData(prev => prev.filter(mode => mode.id !== deletedMode.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [platformId])

  // CRUD operations
  const handleAdd = async (newItem: Partial<AddressingMode>) => {
    if (!user?.id) throw new Error('User not authenticated')

    const addressingModeData = {
      name: newItem.name || '',
      code: newItem.code || '',
      size: newItem.size || 0,
      format: newItem.format,
      pattern: newItem.pattern,
      meta: newItem.meta,
      platformId
    }

    const { data: created, error } = await db.addressingModes.create(addressingModeData, user.id)

    if (error) {
      throw new Error(error.message)
    }

    // Real-time subscription will handle the UI update
    return created
  }

  const handleEdit = async (id: string, updates: Partial<AddressingMode>) => {
    if (!user?.id) throw new Error('User not authenticated')

    // Filter out null values and convert to the expected type
    const cleanUpdates = {
      name: updates.name,
      code: updates.code,
      size: updates.size,
      format: updates.format || undefined,
      pattern: updates.pattern || undefined,
      meta: updates.meta
    }

    const { data: updated, error } = await db.addressingModes.update(id, cleanUpdates, user.id)

    if (error) {
      throw new Error(error.message)
    }

    // Real-time subscription will handle the UI update
    return updated
  }

  const handleDelete = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated')

    const { error } = await db.addressingModes.delete(id, user.id)

    if (error) {
      throw new Error(error.message)
    }

    // Real-time subscription will handle the UI update
  }

  const handleRefresh = () => {
    loadData()
  }

  return (
    <DataTable
      {...props}
      data={data}
      columns={columns}
      loading={loading}
      error={error}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
    />
  )
}
