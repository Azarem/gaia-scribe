import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { StringType } from '@prisma/client'
import type { ColumnDefinition, DataTableProps } from './DataTable'
import DataTable from './DataTable'
import CharacterMapGrid from './CharacterMapGrid'
import StringCommandsTable from './StringCommandsTable'
import { db } from '../services/supabase'
import { useAuthStore } from '../stores/auth-store'

interface StringTypesDataTableProps extends Omit<DataTableProps<StringType>, 'expandedRows' | 'renderExpandedContent'> {
  columns: ColumnDefinition<StringType>[]
}

export default function StringTypesDataTable({
  columns,
  ...props
}: StringTypesDataTableProps) {
  const { user } = useAuthStore()
  const [expandedStringTypes, setExpandedStringTypes] = useState<Set<string>>(new Set())

  const toggleStringTypeExpansion = (stringTypeId: string) => {
    setExpandedStringTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stringTypeId)) {
        newSet.delete(stringTypeId)
      } else {
        newSet.add(stringTypeId)
      }
      return newSet
    })
  }

  const handleCharacterMapSave = async (stringTypeId: string, newCharacterMap: string[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await db.strings.update(stringTypeId, { characterMap: newCharacterMap }, user.id)
    
    if (error) {
      throw new Error(error.message)
    }

    // Update the local data if onEdit is provided
    if (props.onEdit && data) {
      await props.onEdit(stringTypeId, { characterMap: newCharacterMap })
    }
  }

  // Enhanced columns with expand functionality
  const enhancedColumns = useMemo(() => {
    return columns.map(col => {
      if (col.key === 'expand') {
        return {
          ...col,
          render: (_value: any, row: StringType) => (
            <button
              onClick={() => toggleStringTypeExpansion(row.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title={expandedStringTypes.has(row.id) ? 'Collapse' : 'Expand'}
            >
              {expandedStringTypes.has(row.id) ? (
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
  }, [columns, expandedStringTypes])

  const renderExpandedContent = (stringType: StringType) => {
    return (
      <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
        <div className="space-y-8">
          {/* Character Map Section */}
          <CharacterMapGrid
            characterMap={stringType.characterMap || []}
            shiftType={stringType.shiftType}
            onSave={(newCharacterMap) => handleCharacterMapSave(stringType.id, newCharacterMap)}
          />

          {/* Commands Section */}
          <StringCommandsTable
            stringTypeId={stringType.id}
          />
        </div>
      </div>
    )
  }

  return (
    <DataTable
      {...props}
      columns={enhancedColumns}
      expandedRows={expandedStringTypes}
      renderExpandedContent={renderExpandedContent}
    />
  )
}
