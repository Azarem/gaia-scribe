import { useState, useEffect } from 'react'
import clsx from 'clsx'

interface CharacterMapGridProps {
  characterMap: string[]
  shiftType?: string | null
  onSave: (newCharacterMap: string[]) => Promise<void>
  className?: string
}

export default function CharacterMapGrid({
  characterMap,
  shiftType,
  onSave,
  className
}: CharacterMapGridProps) {
  const [editingMap, setEditingMap] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine grid dimensions based on shift type
  const getGridDimensions = () => {
    switch (shiftType?.toLowerCase()) {
      case 'wh2':
        return { rows: 8, cols: 8, total: 64 }
      case 'h2':
        return { rows: 8, cols: 16, total: 128 }
      default:
        return { rows: 16, cols: 16, total: 256 }
    }
  }

  const { rows, cols, total } = getGridDimensions()

  // Initialize editing map when character map changes
  useEffect(() => {
    const normalizedMap = [...characterMap]
    // Pad with empty strings to match grid size
    while (normalizedMap.length < total) {
      normalizedMap.push('')
    }
    // Truncate if too long
    if (normalizedMap.length > total) {
      normalizedMap.splice(total)
    }
    setEditingMap(normalizedMap)
  }, [characterMap, total])

  const handleCellChange = (index: number, value: string) => {
    const newMap = [...editingMap]
    newMap[index] = value
    setEditingMap(newMap)
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setError(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError(null)
    // Reset to original values
    const normalizedMap = [...characterMap]
    while (normalizedMap.length < total) {
      normalizedMap.push('')
    }
    if (normalizedMap.length > total) {
      normalizedMap.splice(total)
    }
    setEditingMap(normalizedMap)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Remove trailing empty strings to optimize storage
      const trimmedMap = [...editingMap]
      while (trimmedMap.length > 0 && trimmedMap[trimmedMap.length - 1] === '') {
        trimmedMap.pop()
      }

      await onSave(trimmedMap)
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving character map:', err)
      setError(err instanceof Error ? err.message : 'Failed to save character map')
    } finally {
      setSaving(false)
    }
  }

  // Helper function to format characters for display
  const formatCharacterForDisplay = (char: string): string => {
    if (char === ' ') {
      return '␣' // Open box symbol (U+2423) to represent space
    }
    return char
  }

  // Helper function to get descriptive text for tooltip
  const getCharacterDescription = (char: string): string => {
    if (char === '') {
      return '(empty)'
    }
    if (char === ' ') {
      return '(space)'
    }
    return char
  }

  const renderCell = (index: number) => {
    const value = editingMap[index] || ''
    const cellNumber = index.toString(16).toUpperCase().padStart(2, '0')

    if (isEditing) {
      // Add subtle background styling for space-containing inputs
      const hasSpace = value === ' '
      const inputClassName = clsx(
        "w-full h-8 text-xs text-center border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
        hasSpace
          ? "border-blue-300 bg-blue-50" // Subtle blue background for spaces
          : "border-gray-300"
      )

      return (
        <input
          key={index}
          type="text"
          value={value}
          onChange={(e) => handleCellChange(index, e.target.value)}
          className={inputClassName}
          maxLength={4}
          title={`Cell 0x${cellNumber}: ${getCharacterDescription(value)}`}
        />
      )
    }

    // Display mode: show visual representation of spaces
    const displayValue = value ? formatCharacterForDisplay(value) : ''

    return (
      <div
        key={index}
        className="w-full h-8 text-xs text-center border border-gray-200 rounded bg-gray-50 flex items-center justify-center"
        title={`Cell 0x${cellNumber}: ${getCharacterDescription(value)}`}
      >
        {displayValue}
      </div>
    )
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Character Map</h3>
          <p className="text-sm text-gray-500">
            {rows}×{cols} grid ({total} cells) - Shift Type: {shiftType || 'default'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Grid */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div 
          className="grid gap-1"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: total }, (_, index) => renderCell(index))}
        </div>
      </div>

      {/* Grid Info */}
      <div className="text-xs text-gray-500">
        <p>Each cell represents a character mapping. Cell addresses are shown in hexadecimal format.</p>
        {isEditing && (
          <p className="mt-1 text-blue-600">
            Click "Save" to apply all changes atomically. All changes will be saved together.
          </p>
        )}
      </div>
    </div>
  )
}
