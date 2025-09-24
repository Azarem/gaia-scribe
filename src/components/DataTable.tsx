import { useState, useMemo } from 'react'
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Check,
  X
} from 'lucide-react'
import clsx from 'clsx'

export interface ColumnDefinition<T = any> {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  editable?: boolean
  type?: 'text' | 'number' | 'boolean' | 'select' | 'textarea'
  options?: { value: any; label: string }[] // For select type
  width?: string
  render?: (value: any, row: T) => React.ReactNode
  validate?: (value: any) => string | null // Return error message or null
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: ColumnDefinition<T>[]
  loading?: boolean
  error?: string | null
  onAdd?: (newItem: Partial<T>) => Promise<void>
  onEdit?: (id: string, updates: Partial<T>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onRefresh?: () => void
  searchPlaceholder?: string
  addButtonText?: string
  emptyMessage?: string
  className?: string
  expandedRows?: Set<string>
  renderExpandedContent?: (row: T) => React.ReactNode
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  error = null,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  searchPlaceholder = "Search...",
  addButtonText = "Add New",
  emptyMessage = "No data available",
  className,
  expandedRows,
  renderExpandedContent
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<T>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState<Partial<T>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  // Helper function to properly handle empty values while preserving zero
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return ''
    }
    return String(value)
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = data.filter(row =>
        columns.some(col => {
          if (!col.filterable) return false
          const value = (row as any)[col.key]
          return formatCellValue(value).toLowerCase().includes(searchLower)
        })
      )
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = (a as any)[sortColumn]
        const bVal = (b as any)[sortColumn]
        
        if (aVal === bVal) return 0
        
        const comparison = aVal < bVal ? -1 : 1
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection, columns])

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (!column?.sortable) return

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const handleEdit = (row: T) => {
    setEditingId(row.id)
    setEditingData({ ...row })
    setValidationErrors({})
    setSaveError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData({})
    setValidationErrors({})
    setSaveError(null)
  }

  const validateField = (column: ColumnDefinition, value: any): string | null => {
    if (column.validate) {
      return column.validate(value)
    }
    return null
  }

  const handleSaveEdit = async () => {
    if (!editingId || !onEdit) return

    // Validate all editable fields
    const errors: Record<string, string> = {}
    columns.forEach(col => {
      if (col.editable) {
        const error = validateField(col, (editingData as any)[col.key])
        if (error) {
          errors[col.key] = error
        }
      }
    })

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setSaveError(null)
      await onEdit(editingId, editingData)
      setEditingId(null)
      setEditingData({})
      setValidationErrors({})
    } catch (err) {
      console.error('Error saving edit:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!onDelete) return
    
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await onDelete(id)
      } catch (err) {
        console.error('Error deleting item:', err)
      }
    }
  }

  const handleAddNew = () => {
    setShowAddForm(true)
    setAddFormData({})
    setValidationErrors({})
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setAddFormData({})
    setValidationErrors({})
  }

  const handleSaveAdd = async () => {
    if (!onAdd) return

    // Validate all required fields
    const errors: Record<string, string> = {}
    columns.forEach(col => {
      if (col.editable) {
        const error = validateField(col, (addFormData as any)[col.key])
        if (error) {
          errors[col.key] = error
        }
      }
    })

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      await onAdd(addFormData)
      setShowAddForm(false)
      setAddFormData({})
      setValidationErrors({})
    } catch (err) {
      console.error('Error adding item:', err)
    }
  }

  const renderCell = (column: ColumnDefinition, row: T, isEditing: boolean) => {
    const value = (row as any)[column.key]

    if (isEditing && column.editable) {
      return renderEditableCell(column, editingData, setEditingData, validationErrors)
    }

    if (column.render) {
      return column.render(value, row)
    }

    if (column.type === 'boolean') {
      return value ? '✓' : '✗'
    }

    return formatCellValue(value)
  }

  const renderEditableCell = (
    column: ColumnDefinition,
    data: Partial<T>,
    setData: (data: Partial<T>) => void,
    errors: Record<string, string>
  ) => {
    let value = (data as any)[column.key]

    // Handle null/undefined values but preserve zero
    if (value === null || value === undefined) {
      value = ''
    }

    // Handle array values for display
    if (Array.isArray(value)) {
      value = value.join(', ')
    }

    // Handle HEX values for editing (convert number back to hex string)
    if (column.type === 'text' && typeof value === 'number' && column.render && column.render.toString().includes('toString(16)')) {
      value = `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
    }

    const error = errors[column.key]

    const handleChange = (newValue: any) => {
      let processedValue = newValue

      // Handle HEX input (convert to number for storage)
      if (column.type === 'text' && typeof newValue === 'string' && column.render && column.render.toString().includes('toString(16)')) {
        const hexValue = newValue.replace(/^0x/i, '')
        if (/^[0-9A-Fa-f]*$/.test(hexValue) && hexValue !== '') {
          processedValue = parseInt(hexValue, 16)
        } else if (hexValue === '') {
          processedValue = null
        } else {
          processedValue = newValue // Keep invalid input for validation
        }
      }

      setData({ ...data, [column.key]: processedValue })
      // Clear validation error when user starts typing
      if (error) {
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[column.key]
          return newErrors
        })
      }
    }

    const handleBlur = (newValue: any) => {
      // Handle array fields (convert comma-separated string to array on blur)
      let processedValue = newValue
      if (column.type === 'textarea' && typeof newValue === 'string') {
        // Check if this field should be an array based on the render function
        if (column.render && column.render.toString().includes('join')) {
          processedValue = newValue.split(',').map((item: string) => item.trim()).filter(Boolean)
        }
      }

      setData({ ...data, [column.key]: processedValue })
    }

    const baseClasses = clsx(
      'w-full px-2 py-1 text-sm border rounded',
      error 
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    )

    switch (column.type) {
      case 'textarea':
        return (
          <div>
            <textarea
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={(e) => handleBlur(e.target.value)}
              className={clsx(baseClasses, 'resize-none')}
              rows={2}
            />
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>
        )
      
      case 'number':
        return (
          <div>
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(Number(e.target.value))}
              className={baseClasses}
            />
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>
        )
      
      case 'boolean':
        return (
          <div>
            <select
              value={value ? 'true' : 'false'}
              onChange={(e) => handleChange(e.target.value === 'true')}
              className={baseClasses}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>
        )
      
      case 'select':
        return (
          <div>
            <select
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className={baseClasses}
            >
              <option value="">Select...</option>
              {column.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>
        )
      
      default:
        return (
          <div>
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className={baseClasses}
            />
            {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className={clsx('bg-white shadow rounded-lg', className)}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={clsx('bg-white shadow rounded-lg', className)}>
        <div className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <X className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('bg-white shadow rounded-lg', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              {processedData.length} of {data.length} items
            </div>
          </div>

          {/* Add Button */}
          {onAdd && (
            <button
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addButtonText}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 font-mono">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.width && `w-${column.width}`
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={clsx(
                            'h-3 w-3',
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          )}
                        />
                        <ChevronDown
                          className={clsx(
                            'h-3 w-3 -mt-1',
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Add Form Row */}
            {showAddForm && (
              <tr className="bg-blue-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.editable ? (
                      renderEditableCell(column, addFormData, setAddFormData, validationErrors)
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={handleSaveAdd}
                      className="text-green-600 hover:text-green-900"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="text-gray-600 hover:text-gray-900"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processedData.map((row) => {
                const isEditing = editingId === row.id
                return (
                  <>
                    <tr key={row.id} className={clsx(isEditing && 'bg-yellow-50')}>
                      {columns.map((column) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {renderCell(column, row, isEditing)}
                        </td>
                      ))}
                      {(onEdit || onDelete) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-900"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-900"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              {onEdit && (
                                <button
                                  onClick={() => handleEdit(row)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                    {/* Save Error Row */}
                    {isEditing && saveError && (
                      <tr>
                        <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-2 bg-red-50">
                          <div className="text-red-700 text-sm">
                            <strong>Error:</strong> {saveError}
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Expanded Content Row */}
                    {expandedRows?.has(row.id) && renderExpandedContent && (
                      <tr>
                        <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="p-0">
                          {renderExpandedContent(row)}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
