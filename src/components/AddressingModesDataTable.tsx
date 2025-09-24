import { useState, useEffect, useCallback } from 'react'
import { Check, X, Edit2, Trash2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth-store'
import { usePlatformPermissions } from '../hooks/usePlatformPermissions'
import { db, supabase } from '../lib/supabase'
import type { AddressingMode, InstructionCode, InstructionGroup } from '@prisma/client'
import DataTable, { type DataTableProps, type ColumnDefinition } from './DataTable'
import clsx from 'clsx'

interface AddressingModesDataTableProps extends Omit<DataTableProps<AddressingModeWithInstructionCodes>, 'data' | 'columns'> {
  platformId: string
  columns: ColumnDefinition<AddressingModeWithInstructionCodes>[]
}

interface AddressingModeWithInstructionCodes extends AddressingMode {
  instructionCodes: InstructionCodeWithGroup[]
}

interface InstructionCodeWithGroup extends InstructionCode {
  group: InstructionGroup,
  mode: AddressingMode
}

export default function AddressingModesDataTable({
  platformId,
  columns,
  ...props
}: AddressingModesDataTableProps) {
  const { user } = useAuthStore()
  const { canManage } = usePlatformPermissions(platformId)
  const [data, setData] = useState<AddressingModeWithInstructionCodes[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [instructionGroups, setInstructionGroups] = useState<InstructionGroup[]>([])

  // Instruction code management state
  const [addCodeFormData, setAddCodeFormData] = useState<{ [modeId: string]: Partial<InstructionCode> }>({})
  const [codeValidationErrors, setCodeValidationErrors] = useState<{ [modeId: string]: Record<string, string> }>({})
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null)
  const [editCodeFormData, setEditCodeFormData] = useState<Partial<InstructionCode>>({})
  const [editCodeValidationErrors, setEditCodeValidationErrors] = useState<Record<string, string>>({})

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

      const { data: instructionGroups, error: instructionGroupFetchError } = await db.instructionGroups.getByPlatform(platformId)
      if (instructionGroupFetchError) {
        throw new Error(instructionGroupFetchError.message)
      }

      const { data: instructionCodes, error: instructionFetchError } = await db.instructionCodes.getByPlatform(platformId)
      if (instructionFetchError) {
        throw new Error(instructionFetchError.message)
      }

      const hydratedData: AddressingModeWithInstructionCodes[] = (addressingModes || []).map(mode => ({
        ...mode,
        instructionCodes: (instructionCodes || []).filter(code => code.modeId === mode.id)
      }))

      setInstructionGroups(instructionGroups || [])
      setData(hydratedData)
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

  // Real-time subscription for AddressingMode changes
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
            const hydratedMode: AddressingModeWithInstructionCodes = {
              ...newMode,
              instructionCodes: []
            }
            setData(prev => [...prev, hydratedMode])
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedMode = payload.new as AddressingMode
            setData(prev => prev.map(mode =>
              mode.id === updatedMode.id ? { ...mode, ...updatedMode } : mode
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

  // Real-time subscription for InstructionCode changes
  useEffect(() => {
    if (!platformId) return

    const channel = supabase
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
          // Reload data to get properly hydrated instruction codes with group and mode info
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [platformId, loadData])

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

  // Instruction Code CRUD operations
  const handleCancelAddCode = (modeId: string) => {
    setAddCodeFormData(prev => ({ ...prev, [modeId]: {} }))
    setCodeValidationErrors(prev => ({ ...prev, [modeId]: {} }))
  }

  const handleEditCode = (code: InstructionCode) => {
    setEditingCodeId(code.id)
    setEditCodeFormData({
      code: code.code,
      cycles: code.cycles,
      groupId: code.groupId
    })
    setEditCodeValidationErrors({})
  }

  const handleCancelEditCode = () => {
    setEditingCodeId(null)
    setEditCodeFormData({})
    setEditCodeValidationErrors({})
  }

  const handleDeleteCode = async (codeId: string) => {
    if (!user?.id) return

    if (!confirm('Are you sure you want to delete this instruction code?')) {
      return
    }

    try {
      const { error } = await db.instructionCodes.delete(codeId, user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Error deleting instruction code:', err)
      alert('Failed to delete instruction code. Please try again.')
    }
  }

  const validateCodeForm = (modeId: string): boolean => {
    const formData = addCodeFormData[modeId] || {}
    const errors: Record<string, string> = {}

    // Group validation
    if (!formData.groupId?.trim()) {
      errors.groupId = 'Group is required'
    }

    // Code validation (hex)
    if (formData.code === undefined || formData.code === null) {
      errors.code = 'Code is required'
    }

    // Cycles validation (optional)
    if (formData.cycles !== undefined && formData.cycles !== null && formData.cycles < 0) {
      errors.cycles = 'Cycles must be non-negative'
    }

    setCodeValidationErrors(prev => ({ ...prev, [modeId]: errors }))
    return Object.keys(errors).length === 0
  }

  const validateEditCodeForm = (): boolean => {
    const formData = editCodeFormData
    const errors: Record<string, string> = {}

    // Group validation
    if (!formData.groupId?.trim()) {
      errors.groupId = 'Group is required'
    }

    // Code validation (hex)
    if (formData.code === undefined || formData.code === null) {
      errors.code = 'Code is required'
    }

    // Cycles validation (optional)
    if (formData.cycles !== undefined && formData.cycles !== null && formData.cycles < 0) {
      errors.cycles = 'Cycles must be non-negative'
    }

    setEditCodeValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveEditCode = async () => {
    if (!user?.id || !editingCodeId || !validateEditCodeForm()) {
      return
    }

    try {
      const updates = {
        code: editCodeFormData.code ?? 0,
        cycles: editCodeFormData.cycles || undefined,
        groupId: editCodeFormData.groupId?.trim() || ''
      }

      const { error } = await db.instructionCodes.update(editingCodeId, updates, user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Real-time subscription will handle the UI update
      handleCancelEditCode()
    } catch (err) {
      console.error('Error updating instruction code:', err)
      setEditCodeValidationErrors({ code: 'Failed to update instruction code. Please try again.' })
    }
  }

  const handleSaveAddCode = async (modeId: string) => {
    if (!user?.id || !validateCodeForm(modeId)) {
      return
    }

    const formData = addCodeFormData[modeId]
    if (!formData) return

    try {
      const codeData = {
        code: formData.code ?? 0,
        cycles: formData.cycles || undefined,
        groupId: formData.groupId?.trim() || '',
        modeId
      }

      const { error } = await db.instructionCodes.create(codeData, user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Real-time subscription will handle the UI update
      handleCancelAddCode(modeId)
    } catch (err) {
      console.error('Error adding instruction code:', err)
      setCodeValidationErrors(prev => ({
        ...prev,
        [modeId]: { code: 'Failed to add instruction code. Please try again.' }
      }))
    }
  }

  const renderCodeEditableCell = (
    modeId: string,
    field: keyof InstructionCode,
    type: 'text' | 'number' | 'hex' | 'select' = 'text'
  ) => {
    const formData = addCodeFormData[modeId] || {}
    const errors = codeValidationErrors[modeId] || {}
    let value = (formData as any)[field] || ''

    // Handle hex display for code
    if (field === 'code' && typeof value === 'number') {
      value = `0x${value.toString(16).toUpperCase().padStart(2, '0')}`
    }

    const error = errors[field]

    const handleChange = (newValue: string) => {
      let processedValue: any = newValue

      // Handle hex input for code
      if (field === 'code') {
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

      setAddCodeFormData(prev => ({
        ...prev,
        [modeId]: { ...prev[modeId], [field]: processedValue }
      }))

      // Clear validation error when user starts typing
      if (error) {
        setCodeValidationErrors(prev => {
          const newErrors = { ...prev }
          if (newErrors[modeId]) {
            const modeErrors = { ...newErrors[modeId] }
            delete modeErrors[field]
            newErrors[modeId] = modeErrors
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

    if (type === 'select' && field === 'groupId') {
      return (
        <div>
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={baseClasses}
          >
            <option value="">Select group...</option>
            {instructionGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
        </div>
      )
    }

    return (
      <div>
        <input
          type={type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={clsx(baseClasses, field === 'code' && 'font-mono')}
          placeholder={
            field === 'code' ? '0xFF' :
            field === 'cycles' ? 'Cycles' :
            field === 'groupId' ? 'Group' : ''
          }
          min={type === 'number' ? 0 : undefined}
        />
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </div>
    )
  }

  const renderEditCodeEditableCell = (
    field: keyof InstructionCode,
    type: 'text' | 'number' | 'hex' | 'select' = 'text'
  ) => {
    const formData = editCodeFormData
    const errors = editCodeValidationErrors
    let value = (formData as any)[field] || ''

    // Handle hex display for code
    if (field === 'code' && typeof value === 'number') {
      value = `0x${value.toString(16).toUpperCase().padStart(2, '0')}`
    }

    const error = errors[field]

    const handleChange = (newValue: string) => {
      let processedValue: any = newValue

      // Handle hex input for code
      if (field === 'code') {
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

      setEditCodeFormData(prev => ({ ...prev, [field]: processedValue }))

      // Clear validation error when user starts typing
      if (error) {
        setEditCodeValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
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

    if (type === 'select' && field === 'groupId') {
      return (
        <div>
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={baseClasses}
          >
            <option value="">Select group...</option>
            {instructionGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
        </div>
      )
    }

    return (
      <div>
        <input
          type={type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={clsx(baseClasses, field === 'code' && 'font-mono')}
          min={type === 'number' ? 0 : undefined}
        />
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </div>
    )
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
      renderExpandedContent={(addressingMode: AddressingModeWithInstructionCodes) => {
        const codes = addressingMode.instructionCodes ?? [];

        return (
          <div className="px-6 py-2 bg-gray-50">
            <div className="text-sm font-medium text-gray-700 mb-3">Instruction Codes:</div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cycles</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Existing Instruction Codes */}
                  {codes && codes
                    .sort((a, b) => a.group.name.localeCompare(b.group.name))
                    .map((code, index) => {
                    const isEditing = editingCodeId === code.id
                    return (
                      <tr key={code.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing ? renderEditCodeEditableCell('groupId', 'select') : (
                            <span className="text-sm text-gray-900">{code.group.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing ? renderEditCodeEditableCell('code', 'hex') : (
                            <span className="text-sm font-mono text-gray-900">
                              0x{code.code.toString(16).toUpperCase().padStart(2, '0')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing ? renderEditCodeEditableCell('cycles', 'number') : (
                            <span className="text-sm text-gray-900">{code.cycles || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={handleSaveEditCode}
                                className="text-green-600 hover:text-green-900"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEditCode}
                                className="text-red-600 hover:text-red-900"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditCode(code)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCode(code.id)}
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

                  {/* Always show Add Form Row at the bottom */}
                  <tr className="bg-blue-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {renderCodeEditableCell(addressingMode.id, 'groupId', 'select')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {renderCodeEditableCell(addressingMode.id, 'code', 'hex')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {renderCodeEditableCell(addressingMode.id, 'cycles', 'number')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleSaveAddCode(addressingMode.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancelAddCode(addressingMode.id)}
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
    />
  )
}
