import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase'
import { ArrowLeft, Home, Cpu } from 'lucide-react'
import type { Platform } from '@prisma/client'
import { getPlatformSectionByRoute } from '../lib/platform-sections'
import Breadcrumbs from '../components/Breadcrumbs'
import AddressingModesDataTable from '../components/AddressingModesDataTable'
import InstructionSetsDataTable from '../components/InstructionSetsDataTable'
import VectorsDataTable from '../components/VectorsDataTable'

// Component to display platform section content
interface PlatformSectionContentProps {
  sectionKey: string
  sectionName: string
  platform: Platform
}

function PlatformSectionContent({ sectionKey, sectionName, platform }: PlatformSectionContentProps) {
  // Handle different section types with proper data table components
  switch (sectionKey) {
    case 'addressingModes':
      return (
        <AddressingModesDataTable
          platformId={platform.id}
          columns={[
            { key: 'name', label: 'Name', sortable: true, editable: true, type: 'text' },
            { key: 'code', label: 'Code', sortable: true, editable: true, type: 'text' },
            {
              key: 'size',
              label: 'Size',
              sortable: true,
              editable: true,
              type: 'number',
              render: (value) => `${value} bytes`
            },
            { key: 'format', label: 'Format', sortable: true, editable: true, type: 'text' },
            { key: 'pattern', label: 'Pattern', sortable: true, editable: true, type: 'text' },
          ]}
          searchPlaceholder="Search addressing modes..."
          addButtonText="Add Addressing Mode"
          emptyMessage="No addressing modes found. Click 'Add Addressing Mode' to create your first entry."
        />
      )

    case 'instructionSet':
      return (
        <InstructionSetsDataTable
          platformId={platform.id}
          columns={[
            {
              key: 'expand',
              label: '',
              width: '40',
              render: () => null // Handled by the component
            },
            { key: 'name', label: 'Group Name', sortable: true, editable: true, type: 'text' },
            {
              key: 'meta',
              label: 'Description',
              editable: true,
              type: 'textarea',
              render: (value) => value?.description || '-'
            },
          ]}
          searchPlaceholder="Search instruction groups..."
          addButtonText="Add Instruction Group"
          emptyMessage="No instruction groups found. Click 'Add Instruction Group' to create your first entry."
        />
      )

    case 'vectors':
      return (
        <VectorsDataTable
          platformId={platform.id}
          columns={[
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
              key: 'isEntry',
              label: 'Entry Point',
              editable: true,
              type: 'boolean',
              render: (value) => value ? 'Yes' : 'No'
            },
          ]}
          searchPlaceholder="Search vectors..."
          addButtonText="Add Vector"
          emptyMessage="No vectors found. Click 'Add Vector' to create your first entry."
        />
      )

    case 'projects':
      return <PlatformProjectsList platformId={platform.id} />

    default:
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <Cpu className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Section Not Implemented</h3>
          <p className="text-gray-500">
            The {sectionName} section is not yet implemented.
          </p>
        </div>
      )
  }
}

// Component to list projects using this platform
function PlatformProjectsList({ platformId }: { platformId: string }) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await db.projects.getAll()
        const platformProjects = data?.filter(p => p.platformId === platformId) || []
        setProjects(platformProjects)
      } catch (error) {
        console.error('Error loading platform projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [platformId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading projects...</span>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No projects are currently using this platform.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        Projects using this platform ({projects.length})
      </h3>
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => navigate(`/projects/${project.id}`)}
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
              <p className="text-xs text-gray-500">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlatformSectionPage() {
  const { id, section } = useParams<{ id: string; section: string }>()
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get section configuration
  const sectionConfig = getPlatformSectionByRoute(section || '')

  // Load platform details
  useEffect(() => {
    if (!id) {
      setError('Platform ID is required')
      setLoading(false)
      return
    }

    const loadPlatform = async () => {
      try {
        const { data, error } = await db.platforms.getById(id)
        
        if (error) {
          setError('Failed to load platform')
          return
        }

        if (!data) {
          setError('Platform not found')
          return
        }

        setPlatform(data)
      } catch (err) {
        console.error('Error loading platform:', err)
        setError('Failed to load platform')
      } finally {
        setLoading(false)
      }
    }

    loadPlatform()
  }, [id])

  const handleBack = () => {
    navigate(`/platforms/${id}`)
  }

  const handleHome = () => {
    navigate('/platforms')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading platform...</span>
        </div>
      </div>
    )
  }

  if (error || !platform) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Cpu className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Platform Not Found</h3>
          <p className="text-gray-500 mb-6">{error || 'The platform you are looking for does not exist.'}</p>
          <button
            onClick={handleHome}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Platforms
          </button>
        </div>
      </div>
    )
  }

  if (!sectionConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Cpu className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Section Not Found</h3>
          <p className="text-gray-500 mb-6">The section "{section}" does not exist for this platform.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Platform
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                {sectionConfig.icon}
                <div className="ml-3">
                  <h1 className="text-2xl font-bold text-gray-900">{sectionConfig.name}</h1>
                  <p className="text-sm text-gray-500">{platform.name}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleHome}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Home className="h-4 w-4 mr-2" />
              Platforms
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs
          items={[
            { label: 'Platforms', href: '/platforms' },
            { label: platform.name, href: `/platforms/${platform.id}` },
            { label: sectionConfig.name, href: `/platform/${platform.id}/${sectionConfig.route}` }
          ]}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              {sectionConfig.icon}
              <div className="ml-3">
                <h2 className="text-lg font-medium text-gray-900">{sectionConfig.name}</h2>
                <p className="text-sm text-gray-500">{sectionConfig.description}</p>
              </div>
            </div>
          </div>

          {/* Section Content */}
          <div className="p-6">
            <PlatformSectionContent
              sectionKey={sectionConfig.key}
              sectionName={sectionConfig.name}
              platform={platform}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
