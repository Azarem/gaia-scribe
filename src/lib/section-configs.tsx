import type { ColumnDefinition } from '../components/DataTable'
import type { 
  File, 
  Block, 
  Cop, 
  StringType, 
  Struct, 
  Label, 
  Rewrite, 
  GameMnemonic, 
  Override 
} from '@prisma/client'

// Files Section Configuration
export const filesColumns: ColumnDefinition<File>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Name is required'
      if (value.length > 255) return 'Name must be less than 255 characters'
      return null
    }
  },
  {
    key: 'location',
    label: 'START',
    sortable: true,
    editable: true,
    type: 'text',
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(6, '0')}` : '',
    validate: (value) => {
      if(typeof value === 'number') return value < 0 ? 'Address must be non-negative' : null;
      if (!value || value.trim() === '') return 'START address is required'
      const hexValue = value.replace(/^0x/i, '')
      if (!/^[0-9A-Fa-f]+$/.test(hexValue)) return 'Must be a valid hexadecimal value'
      const numValue = parseInt(hexValue, 16)
      if (numValue < 0) return 'Address must be non-negative'
      return null
    }
  },
  {
    key: 'size',
    label: 'Size',
    sortable: true,
    editable: true,
    type: 'text',
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(4, '0')}` : '',
    validate: (value) => {
      if(typeof value === 'number') return value < 0 ? 'Size must be non-negative' : null;
      if (!value || value.trim() === '') return 'Size is required'
      const hexValue = value.replace(/^0x/i, '')
      if (!/^[0-9A-Fa-f]+$/.test(hexValue)) return 'Must be a valid hexadecimal value'
      const numValue = parseInt(hexValue, 16)
      if (numValue < 0) return 'Size must be non-negative'
      return null
    }
  },
  {
    key: 'end',
    label: 'END',
    sortable: false,
    editable: false,
    render: (_value, row) => {
      const location = row.location
      const size = row.size
      if (location !== null && location !== undefined && size !== null && size !== undefined) {
        const endAddress = location + size
        return `0x${endAddress.toString(16).toUpperCase().padStart(4, '0')}`
      }
      return ''
    }
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Type is required'
      return null
    }
  },
  {
    key: 'group',
    label: 'Group',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text'
  },
  {
    key: 'scene',
    label: 'Scene',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text'
  },
  {
    key: 'compressed',
    label: 'Compressed',
    sortable: true,
    editable: true,
    type: 'boolean'
  },
  {
    key: 'upper',
    label: 'Upper',
    sortable: true,
    editable: true,
    type: 'boolean'
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    editable: false,
    width: '80px',
    render: () => null // Will be handled by FilesDataTable
  }
]

// Files Section Configuration Object
export const filesConfig = {
  columns: filesColumns,
  defaultSort: {
    column: 'location',
    direction: 'asc' as const
  }
}

// Blocks Section Configuration
export const blocksColumns: ColumnDefinition<Block>[] = [
  {
    key: 'expand',
    label: '',
    sortable: false,
    editable: false,
    width: '40px',
    render: () => null // Will be handled by BlocksDataTable
  },
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Name is required'
      if (value.length > 255) return 'Name must be less than 255 characters'
      return null
    }
  },
  {
    key: 'startAddress',
    label: 'START',
    sortable: true,
    editable: false,
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(6, '0')}` : ''
  },
  {
    key: 'endAddress',
    label: 'END',
    sortable: true,
    editable: false,
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(6, '0')}` : ''
  },
  {
    key: 'movable',
    label: 'Movable',
    sortable: true,
    editable: true,
    type: 'boolean'
  },
  {
    key: 'group',
    label: 'Group',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text'
  },
  {
    key: 'scene',
    label: 'Scene',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text'
  },
  {
    key: 'postProcess',
    label: 'Post Process',
    sortable: true,
    editable: true,
    type: 'text'
  }
]

// Blocks Section Configuration Object
export const blocksConfig = {
  columns: blocksColumns,
  defaultSort: {
    column: 'startAddress',
    direction: 'asc' as const
  }
}

// COPs Section Configuration
export const copsColumns: ColumnDefinition<Cop>[] = [
  {
    key: 'code',
    label: 'Code',
    sortable: true,
    editable: true,
    type: 'number',
    validate: (value) => {
      if (value === null || value === undefined) return 'Code is required'
      if (value < 0 || value > 255) return 'Code must be between 0 and 255'
      return null
    }
  },
  {
    key: 'mnemonic',
    label: 'Mnemonic',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Mnemonic is required'
      if (value.length > 50) return 'Mnemonic must be less than 50 characters'
      return null
    }
  },
  {
    key: 'parts',
    label: 'Parts',
    editable: true,
    type: 'textarea',
    render: (value) => Array.isArray(value) ? value.join(', ') : '',
    validate: (value) => {
      // Convert string to array for validation
      if (typeof value === 'string') {
        return value.trim() === '' ? null : null // Allow empty arrays
      }
      return null
    }
  },
  {
    key: 'halt',
    label: 'Halt',
    sortable: true,
    editable: true,
    type: 'boolean'
  }
]

// String Types Section Configuration
export const stringsColumns: ColumnDefinition<StringType>[] = [
  {
    key: 'expand',
    label: '',
    sortable: false,
    editable: false,
    width: '40px',
    render: () => null // Will be handled by StringTypesDataTable
  },
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Name is required'
      if (value.length > 255) return 'Name must be less than 255 characters'
      return null
    }
  },
  {
    key: 'delimiter',
    label: 'Delimiter',
    sortable: true,
    editable: true,
    type: 'text'
  },
  {
    key: 'shiftType',
    label: 'Shift Type',
    sortable: true,
    editable: true,
    type: 'text'
  },
  {
    key: 'terminator',
    label: 'Terminator',
    sortable: true,
    editable: true,
    type: 'number'
  },
  {
    key: 'greedy',
    label: 'Greedy',
    sortable: true,
    editable: true,
    type: 'boolean'
  }
]

// Structs Section Configuration
export const structsColumns: ColumnDefinition<Struct>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Name is required'
      if (value.length > 255) return 'Name must be less than 255 characters'
      return null
    }
  },
  {
    key: 'types',
    label: 'Types',
    editable: true,
    type: 'textarea',
    render: (value) => Array.isArray(value) ? value.join(', ') : ''
  },
  {
    key: 'delimiter',
    label: 'Delimiter',
    sortable: true,
    editable: true,
    type: 'number'
  },
  {
    key: 'discriminator',
    label: 'Discriminator',
    sortable: true,
    editable: true,
    type: 'number'
  },
  {
    key: 'parent',
    label: 'Parent',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text'
  },
  {
    key: 'parts',
    label: 'Parts',
    editable: true,
    type: 'textarea',
    render: (value) => Array.isArray(value) ? value.join(', ') : ''
  }
]

// Labels Section Configuration
export const labelsColumns: ColumnDefinition<Label>[] = [
  {
    key: 'location',
    label: 'Location',
    sortable: true,
    editable: true,
    type: 'text',
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(4, '0')}` : '',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Location is required'
      const hexValue = value.replace(/^0x/i, '')
      if (!/^[0-9A-Fa-f]+$/.test(hexValue)) return 'Must be a valid hexadecimal value'
      const numValue = parseInt(hexValue, 16)
      if (numValue < 0) return 'Location must be non-negative'
      return null
    }
  },
  {
    key: 'label',
    label: 'Label',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Label is required'
      if (value.length > 255) return 'Label must be less than 255 characters'
      return null
    }
  }
]

// Rewrites Section Configuration
export const rewritesColumns: ColumnDefinition<Rewrite>[] = [
  {
    key: 'location',
    label: 'Location',
    sortable: true,
    editable: true,
    type: 'text',
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(4, '0')}` : '',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Location is required'
      const hexValue = value.replace(/^0x/i, '')
      if (!/^[0-9A-Fa-f]+$/.test(hexValue)) return 'Must be a valid hexadecimal value'
      const numValue = parseInt(hexValue, 16)
      if (numValue < 0) return 'Location must be non-negative'
      return null
    }
  },
  {
    key: 'value',
    label: 'Value',
    sortable: true,
    editable: true,
    type: 'text',
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(2, '0')}` : '',
    validate: (value) => {
      if (value === null || value === undefined || value === '' || value === '0x0' || value === '0x00') {
        return null // Allow 0 as a valid value
      }
      const hexValue = value.toString().replace(/^0x/i, '')
      if (!/^[0-9A-Fa-f]+$/.test(hexValue)) return 'Must be a valid hexadecimal value'
      return null
    }
  }
]

// Mnemonics Section Configuration
export const mnemonicsColumns: ColumnDefinition<GameMnemonic>[] = [
  {
    key: 'address',
    label: 'Address',
    sortable: true,
    editable: true,
    type: 'text',
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(4, '0')}` : '',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Address is required'
      const hexValue = value.replace(/^0x/i, '')
      if (!/^[0-9A-Fa-f]+$/.test(hexValue)) return 'Must be a valid hexadecimal value'
      const numValue = parseInt(hexValue, 16)
      if (numValue < 0) return 'Address must be non-negative'
      return null
    }
  },
  {
    key: 'mnemonic',
    label: 'Mnemonic',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => {
      if (!value || !value.trim()) return 'Mnemonic is required'
      if (value.length > 255) return 'Mnemonic must be less than 255 characters'
      return null
    }
  }
]

// Overrides Section Configuration
export const overridesColumns: ColumnDefinition<Override>[] = [
  {
    key: 'location',
    label: 'Location',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    render: (value) => value !== null && value !== undefined ? `0x${value.toString(16).toUpperCase().padStart(6, '0')}` : '',
    validate: (value) => {
      if (typeof value === 'number') return value < 0 ? 'Location must be non-negative' : null;
      if (!value || value.trim() === '') return 'Location is required'
      const hexValue = value.replace(/^0x/i, '')
      if (!/^[0-9A-Fa-f]+$/.test(hexValue)) return 'Must be a valid hexadecimal value'
      const numValue = parseInt(hexValue, 16)
      if (numValue < 0) return 'Location must be non-negative'
      return null
    }
  },
  {
    key: 'register',
    label: 'Register',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'select',
    options: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'E', label: 'E' },
      { value: 'H', label: 'H' },
      { value: 'L', label: 'L' }
    ],
    validate: (value) => {
      if (!value) return 'Register is required'
      return null
    }
  },
  {
    key: 'value',
    label: 'Value',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'number',
    validate: (value) => {
      if (value === null || value === undefined) return 'Value is required'
      return null
    }
  }
]
