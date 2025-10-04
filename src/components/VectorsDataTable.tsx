import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { usePlatformPermissions } from '../hooks/usePlatformPermissions'
import { supabase } from '../lib/supabase'
import { db } from '../services/supabase'
import type { Vector } from '@prisma/client'
import DataTable, { type DataTableProps, type ColumnDefinition } from './DataTable'

interface VectorsDataTableProps extends Omit<DataTableProps<Vector>, 'data' | 'columns'> {
  platformId: string
}

export default function VectorsDataTable({
  platformId,
  ...props
}: VectorsDataTableProps) {
  const { user, isAnonymousMode } = useAuthStore()
  const { canManage } = usePlatformPermissions(platformId)
  const [data, setData] = useState<Vector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const columns : ColumnDefinition<Vector>[] = [
    { key: 'name', label: 'Name', sortable: true, editable: true, type: 'text' },
    {
      key: 'address',
      label: 'Address',
      sortable: true,
      editable: true,
      type: 'number',
      render: (value) => `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
    },
    {
      key: 'isEntryPoint',
      label: 'Entry',
      editable: true,
      type: 'boolean',
      render: (value) => value ? 'Yes' : 'No'
    },
    {
      key: 'isRomHeader',
      label: 'Head',
      editable: true,
      type: 'boolean',
      render: (value) => value ? 'Yes' : 'No'
    },
  ];

  // Load vectors for the platform
  const loadData = useCallback(async () => {
    if (!platformId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: vectors, error: fetchError } = await db.vectors.getByPlatform(platformId)

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setData(vectors || [])
    } catch (err) {
      console.error('Error loading vectors:', err)
      setError(err instanceof Error ? err.message : 'Failed to load vectors')
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

    // Skip realtime subscriptions in anonymous mode or without user
    if (!user || isAnonymousMode) {
      console.log('Skipping Vector realtime subscription - no authenticated user')
      return
    }

    const channel = supabase
      .channel(`vectors-${platformId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Vector',
          filter: `platformId=eq.${platformId}`
        },
        (payload) => {
          console.log('Vector change received:', payload)

          if (payload.eventType === 'INSERT' && payload.new) {
            const newVector = payload.new as Vector
            setData(prev => [...prev, newVector])
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedVector = payload.new as Vector
            setData(prev => prev.map(vector => 
              vector.id === updatedVector.id ? updatedVector : vector
            ))
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedVector = payload.old as Vector
            setData(prev => prev.filter(vector => vector.id !== deletedVector.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [platformId, user, isAnonymousMode])

  // CRUD operations
  const handleAdd = async (newItem: Partial<Vector>) => {
    if (!user?.id) throw new Error('User not authenticated')

    const { data: created, error } = await db.vectors.create(newItem, user.id)

    if (error) {
      throw new Error(error.message)
    }

    // Real-time subscription will handle the UI update
    return created
  }

  const handleEdit = async (id: string, updates: Partial<Vector>) => {
    if (!user?.id) throw new Error('User not authenticated')

    const { data: updated, error } = await db.vectors.update(id, updates, user.id)

    if (error) {
      throw new Error(error.message)
    }

    // Real-time subscription will handle the UI update
    return updated
  }

  const handleDelete = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated')

    const { error } = await db.vectors.delete(id, user.id)

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
      onAdd={canManage ? handleAdd : undefined}
      onEdit={canManage ? handleEdit : undefined}
      onDelete={canManage ? handleDelete : undefined}
      onRefresh={handleRefresh}
    />
  )
}
