import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DataTable, { ColumnDefinition } from '../DataTable'

// Mock data for testing
const mockData = [
  { id: '1', name: 'Test Item 1', value: 100, active: true },
  { id: '2', name: 'Test Item 2', value: 200, active: false },
  { id: '3', name: 'Another Item', value: 150, active: true }
]

const mockColumns: ColumnDefinition[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    filterable: true,
    editable: true,
    type: 'text',
    validate: (value) => value ? null : 'Name is required'
  },
  {
    key: 'value',
    label: 'Value',
    sortable: true,
    editable: true,
    type: 'number',
    validate: (value) => value >= 0 ? null : 'Value must be positive'
  },
  {
    key: 'active',
    label: 'Active',
    sortable: true,
    editable: true,
    type: 'boolean'
  }
]

describe('DataTable', () => {
  it('renders data correctly', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )

    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    expect(screen.getByText('Test Item 2')).toBeInTheDocument()
    expect(screen.getByText('Another Item')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={true}
      />
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        error="Failed to load data"
      />
    )

    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('filters data when searching', async () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Another' } })

    await waitFor(() => {
      expect(screen.getByText('Another Item')).toBeInTheDocument()
      expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument()
    })
  })

  it('sorts data when clicking column headers', async () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    )

    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)

    // After sorting, "Another Item" should come first alphabetically
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Another Item')
  })

  it('shows add form when add button is clicked', async () => {
    const mockOnAdd = vi.fn()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onAdd={mockOnAdd}
        addButtonText="Add Item"
      />
    )

    const addButton = screen.getByText('Add Item')
    fireEvent.click(addButton)

    // Should show editable form row
    expect(screen.getByDisplayValue('')).toBeInTheDocument()
  })

  it('enters edit mode when edit button is clicked', async () => {
    const mockOnEdit = vi.fn()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onEdit={mockOnEdit}
      />
    )

    const editButtons = screen.getAllByTitle('Edit')
    fireEvent.click(editButtons[0])

    // Should show editable inputs
    expect(screen.getByDisplayValue('Test Item 1')).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', async () => {
    const mockOnDelete = vi.fn()
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true)
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onDelete={mockOnDelete}
      />
    )

    const deleteButtons = screen.getAllByTitle('Delete')
    fireEvent.click(deleteButtons[0])

    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('shows validation errors', async () => {
    const mockOnAdd = vi.fn()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onAdd={mockOnAdd}
      />
    )

    // Open add form
    const addButton = screen.getByText('Add New')
    fireEvent.click(addButton)

    // Try to save without filling required field
    const saveButton = screen.getByTitle('Save')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })

  it('shows empty message when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No items found"
      />
    )

    expect(screen.getByText('No items found')).toBeInTheDocument()
  })
})
