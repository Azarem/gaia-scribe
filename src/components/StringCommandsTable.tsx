import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Check, X } from 'lucide-react'
import clsx from 'clsx'
import type { StringCommand } from '@prisma/client'
import { db } from '../lib/supabase'
import { useAuthStore } from '../stores/auth-store'

interface StringCommandsTableProps {
  stringTypeId: string
  className?: string
}

export default function StringCommandsTable({
  stringTypeId,
  className
}: StringCommandsTableProps) {
  const { user } = useAuthStore()
  const [commands, setCommands] = useState<StringCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<StringCommand & { typesString?: string; partsString?: string }>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState<Partial<StringCommand & { typesString?: string; partsString?: string }>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadCommands = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await db.stringCommands.getByStringType(stringTypeId)
      
      if (error) {
        setError('Failed to load commands')
        return
      }
      
      setCommands(data || [])
    } catch (err) {
      console.error('Error loading commands:', err)
      setError('Failed to load commands')
    } finally {
      setLoading(false)
    }
  }, [stringTypeId])

  // Load commands
  useEffect(() => {
    loadCommands()
  }, [loadCommands])

  const handleAdd = async () => {
    if (!user?.id) return

    try {
      setSaveError(null)
      
      const commandData = {
        ...addFormData,
        stringTypeId,
        code: Number(addFormData.code),
        types: Array.isArray(addFormData.types) ? addFormData.types :
               addFormData.typesString ? addFormData.typesString.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        parts: Array.isArray(addFormData.parts) ? addFormData.parts :
               addFormData.partsString ? addFormData.partsString.split(',').map((p: string) => p.trim()).filter(Boolean) : []
      }

      // Remove the string helper fields before sending to API
      delete (commandData as any).typesString
      delete (commandData as any).partsString

      const { data, error } = await db.stringCommands.create(commandData as any, user.id)

      if (error) {
        setSaveError(error.message)
        return
      }

      if (data) {
        setCommands(prev => [...prev, data])
        setShowAddForm(false)
        setAddFormData({})
      }
    } catch (err) {
      console.error('Error adding command:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to add command')
    }
  }

  const handleEdit = async (id: string) => {
    if (!user?.id) return

    try {
      setSaveError(null)
      
      const updates = {
        ...editingData,
        code: editingData.code !== undefined ? Number(editingData.code) : undefined,
        types: Array.isArray(editingData.types) ? editingData.types :
               editingData.typesString ? editingData.typesString.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined,
        parts: Array.isArray(editingData.parts) ? editingData.parts :
               editingData.partsString ? editingData.partsString.split(',').map((p: string) => p.trim()).filter(Boolean) : undefined,
        delimiter: editingData.delimiter === null ? undefined : editingData.delimiter,
        halt: editingData.halt === null ? undefined : editingData.halt
      }

      // Remove the string helper fields before sending to API
      delete (updates as any).typesString
      delete (updates as any).partsString

      const { data, error } = await db.stringCommands.update(id, updates, user.id)

      if (error) {
        setSaveError(error.message)
        return
      }

      if (data) {
        setCommands(prev => prev.map(cmd => cmd.id === id ? data : cmd))
        setEditingId(null)
        setEditingData({})
      }
    } catch (err) {
      console.error('Error updating command:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to update command')
    }
  }

  const handleDelete = async (id: string) => {
    if (!user?.id || !confirm('Are you sure you want to delete this command?')) return

    try {
      const { error } = await db.stringCommands.delete(id, user.id)

      if (error) {
        setSaveError(error.message)
        return
      }

      setCommands(prev => prev.filter(cmd => cmd.id !== id))
    } catch (err) {
      console.error('Error deleting command:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to delete command')
    }
  }

  const startEdit = (command: StringCommand) => {
    setEditingId(command.id)
    setEditingData({
      code: command.code,
      mnemonic: command.mnemonic,
      types: command.types,
      typesString: Array.isArray(command.types) ? command.types.join(', ') : '',
      delimiter: command.delimiter,
      halt: command.halt,
      parts: command.parts,
      partsString: Array.isArray(command.parts) ? command.parts.join(', ') : ''
    })
    setSaveError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingData({})
    setSaveError(null)
  }

  const startAdd = () => {
    setShowAddForm(true)
    setAddFormData({})
    setSaveError(null)
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setAddFormData({})
    setSaveError(null)
  }

  if (loading) {
    return (
      <div className={clsx('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Commands</h3>
        </div>
        <div className="text-center py-8 text-gray-500">Loading commands...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={clsx('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Commands</h3>
        </div>
        <div className="text-center py-8 text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Commands</h3>
        <button
          onClick={startAdd}
          className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Command
        </button>
      </div>

      {/* Error Message */}
      {saveError && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
          <strong>Error:</strong> {saveError}
        </div>
      )}

      {/* Commands Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 font-mono text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mnemonic</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Types</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delimiter</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Halt</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parts</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Add Form Row */}
            {showAddForm && (
              <tr className="bg-blue-50">
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={addFormData.code || ''}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, code: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Code"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={addFormData.mnemonic || ''}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, mnemonic: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Mnemonic"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={addFormData.typesString || ''}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, typesString: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Types (comma-separated)"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={addFormData.delimiter || ''}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, delimiter: parseInt(e.target.value) || undefined }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Delimiter"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={addFormData.halt ? 'true' : 'false'}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, halt: e.target.value === 'true' }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={addFormData.partsString || ''}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, partsString: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Parts (comma-separated)"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleAdd}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelAdd}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Command Rows */}
            {commands.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No commands found. Click "Add Command" to create your first command.
                </td>
              </tr>
            ) : (
              commands.map((command) => {
                const isEditing = editingId === command.id
                return (
                  <tr key={command.id} className={clsx(isEditing && 'bg-yellow-50')}>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editingData.code || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, code: parseInt(e.target.value) || 0 }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        command.code
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingData.mnemonic || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, mnemonic: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        command.mnemonic
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingData.typesString || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, typesString: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        Array.isArray(command.types) ? command.types.join(', ') : ''
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editingData.delimiter || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, delimiter: parseInt(e.target.value) || undefined }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        command.delimiter || ''
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <select
                          value={editingData.halt ? 'true' : 'false'}
                          onChange={(e) => setEditingData(prev => ({ ...prev, halt: e.target.value === 'true' }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      ) : (
                        command.halt ? '✓' : '✗'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingData.partsString || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, partsString: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        Array.isArray(command.parts) ? command.parts.join(', ') : ''
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEdit(command.id)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => startEdit(command)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(command.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
