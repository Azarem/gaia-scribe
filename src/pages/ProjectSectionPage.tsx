import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { db } from '../services/supabase'
import { ArrowLeft, Home } from 'lucide-react'
import type { ScribeProject } from '@prisma/client'
import { getSectionByRoute } from '../lib/project-sections'
import { useCanEditProject } from '../hooks/useProjectPermissions'
import DataTable from '../components/DataTable'
import FilesDataTable from '../components/FilesDataTable'
import BlocksDataTable from '../components/BlocksDataTable'
import StringTypesDataTable from '../components/StringTypesDataTable'
import Breadcrumbs from '../components/Breadcrumbs'
import {
  filesColumns,
  blocksColumns,
  copsColumns,
  stringsColumns,
  structsColumns,
  labelsColumns,
  rewritesColumns,
  mnemonicsColumns,
  overridesColumns
} from '../lib/section-configs'

export default function ProjectSectionPage() {
  const { id, section } = useParams<{ id: string; section: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [project, setProject] = useState<ScribeProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionData, setSectionData] = useState<any[]>([])
  const [sectionLoading, setSectionLoading] = useState(false)
  const [sectionError, setSectionError] = useState<string | null>(null)

  // Check edit permissions
  const { canEdit, loading: permissionsLoading } = useCanEditProject(id || null)

  // Get section configuration
  const sectionConfig = getSectionByRoute(section || '')

  // Get column configuration based on section
  const getColumnConfig = () => {
    switch (section) {
      case 'files': return filesColumns
      case 'blocks': return blocksColumns
      case 'cops': return copsColumns
      case 'strings': return stringsColumns
      case 'structs': return structsColumns
      case 'labels': return labelsColumns
      case 'rewrites': return rewritesColumns
      case 'mnemonics': return mnemonicsColumns
      case 'overrides': return overridesColumns
      default: return []
    }
  }

  // Get database methods based on section
  const getDbMethods = useCallback(() => {
    switch (section) {
      case 'files': return db.files
      case 'blocks': return db.blocks
      case 'cops': return db.cops
      case 'strings': return db.strings
      case 'structs': return db.structs
      case 'labels': return db.labels
      case 'rewrites': return db.rewrites
      case 'mnemonics': return db.mnemonics
      case 'overrides': return db.overrides
      default: return null
    }
  }, [section])

  // Load project details
  useEffect(() => {
    if (!id) {
      setError('Project ID is required')
      setLoading(false)
      return
    }

    const loadProject = async () => {
      try {
        const { data, error } = await db.projects.getById(id)

        if (error) {
          setError('Failed to load project')
          return
        }

        if (!data) {
          setError('Project not found')
          return
        }

        setProject(data)
      } catch (err) {
        console.error('Error loading project:', err)
        setError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [id])

  // Load section data
  useEffect(() => {
    if (!id || !section || !sectionConfig) return

    const loadSectionData = async () => {
      const dbMethods = getDbMethods()
      if (!dbMethods || dbMethods === db.blocks) return

      try {
        setSectionLoading(true)
        setSectionError(null)

        const { data, error } = await dbMethods.getByProject(id)

        if (error) {
          setSectionError(`Failed to load ${sectionConfig.name.toLowerCase()}`)
          return
        }

        setSectionData(data || [])
      } catch (err) {
        console.error(`Error loading ${section} data:`, err)
        setSectionError(`Failed to load ${sectionConfig.name.toLowerCase()}`)
      } finally {
        setSectionLoading(false)
      }
    }

    loadSectionData()
  }, [id, section, sectionConfig, getDbMethods])

  // CRUD Operations
  const handleAdd = async (newItem: any) => {
    if (!user?.id || !id) return

    const dbMethods = getDbMethods()
    if (!dbMethods) return

    try {
      const itemWithProject = { ...newItem, projectId: id }
      const { data, error } = await dbMethods.create(itemWithProject, user.id)

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        setSectionData(prev => [...prev, data])
      }
    } catch (err) {
      console.error('Error adding item:', err)
      throw err
    }
  }

  const handleEdit = async (itemId: string, updates: any) => {
    if (!user?.id) return

    const dbMethods = getDbMethods()
    if (!dbMethods) return

    try {
      const { data, error } = await dbMethods.update(itemId, updates, user.id)

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        setSectionData(prev => prev.map(item => item.id === itemId ? data : item))
      }
    } catch (err) {
      console.error('Error updating item:', err)
      throw err
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!user?.id) return

    const dbMethods = getDbMethods()
    if (!dbMethods) return

    try {
      const { error } = await dbMethods.delete(itemId, user.id)

      if (error) {
        throw new Error(error.message)
      }

      setSectionData(prev => prev.filter(item => item.id !== itemId))
    } catch (err) {
      console.error('Error deleting item:', err)
      throw err
    }
  }

  const handleRefresh = () => {
    // Trigger a re-load of section data
    if (id && section && sectionConfig) {
      const loadSectionData = async () => {
        const dbMethods = getDbMethods()
        if (!dbMethods) return

        try {
          setSectionLoading(true)
          setSectionError(null)

          const { data, error } = await dbMethods.getByProject(id)

          if (error) {
            setSectionError(`Failed to load ${sectionConfig.name.toLowerCase()}`)
            return
          }

          setSectionData(data || [])
        } catch (err) {
          console.error(`Error loading ${section} data:`, err)
          setSectionError(`Failed to load ${sectionConfig.name.toLowerCase()}`)
        } finally {
          setSectionLoading(false)
        }
      }

      loadSectionData()
    }
  }

  const handleBack = () => {
    navigate(`/projects/${id}`)
  }

  const handleHome = () => {
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (error || !project || !sectionConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {!sectionConfig ? 'Section Not Found' : 'Project Not Found'}
          </h1>
          <p className="text-gray-600 mb-4">
            {error || (!sectionConfig ? 'The requested section could not be found.' : 'The requested project could not be found.')}
          </p>
          <div className="space-x-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </button>
            <button
              onClick={handleHome}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="py-4 border-b border-gray-200">
            <Breadcrumbs
              items={[
                {
                  label: 'Dashboard',
                  href: '/dashboard',
                  icon: <Home className="h-4 w-4" />
                },
                {
                  label: project.name,
                  href: `/projects/${project.id}`
                },
                {
                  label: sectionConfig.name,
                  icon: sectionConfig.icon,
                  current: true
                }
              ]}
            />
          </div>

          {/* Main Header */}
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                  <div className="h-6 w-6 text-blue-600">
                    {sectionConfig.icon}
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{sectionConfig.name}</h1>
                  <p className="text-sm text-gray-500">{sectionConfig.description}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleHome}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {section === 'files' ? (
          <FilesDataTable
            data={sectionData}
            project={project || undefined}
            columns={getColumnConfig() as any}
            loading={sectionLoading}
            error={sectionError}
            onAdd={canEdit && !permissionsLoading ? handleAdd : undefined}
            onEdit={canEdit && !permissionsLoading ? handleEdit : undefined}
            onDelete={canEdit && !permissionsLoading ? handleDelete : undefined}
            onRefresh={handleRefresh}
            searchPlaceholder={`Search ${sectionConfig.name.toLowerCase()}...`}
            addButtonText={`Add ${sectionConfig.name.slice(0, -1)}`} // Remove 's' from plural
            emptyMessage={`No ${sectionConfig.name.toLowerCase()} found. Click "Add ${sectionConfig.name.slice(0, -1)}" to create your first entry.`}
          />
        ) : section === 'blocks' ? (
          <BlocksDataTable
            //data={sectionData}
            projectId={id || ''}
            project={project || undefined}
            columns={getColumnConfig() as any}
            loading={sectionLoading}
            error={sectionError}
            onAdd={canEdit && !permissionsLoading ? handleAdd : undefined}
            onEdit={canEdit && !permissionsLoading ? handleEdit : undefined}
            onDelete={canEdit && !permissionsLoading ? handleDelete : undefined}
            onRefresh={handleRefresh}
            onBuildComplete={handleRefresh}
            searchPlaceholder={`Search ${sectionConfig.name.toLowerCase()}...`}
            addButtonText={`Add ${sectionConfig.name.slice(0, -1)}`} // Remove 's' from plural
            emptyMessage={`No ${sectionConfig.name.toLowerCase()} found. Click "Add ${sectionConfig.name.slice(0, -1)}" to create your first entry.`}
          />
        ) : section === 'strings' ? (
          <StringTypesDataTable
            data={sectionData}
            columns={getColumnConfig() as any}
            loading={sectionLoading}
            error={sectionError}
            onAdd={canEdit && !permissionsLoading ? handleAdd : undefined}
            onEdit={canEdit && !permissionsLoading ? handleEdit : undefined}
            onDelete={canEdit && !permissionsLoading ? handleDelete : undefined}
            onRefresh={handleRefresh}
            searchPlaceholder={`Search ${sectionConfig.name.toLowerCase()}...`}
            addButtonText={`Add ${sectionConfig.name.slice(0, -1)}`} // Remove 's' from plural
            emptyMessage={`No ${sectionConfig.name.toLowerCase()} found. Click "Add ${sectionConfig.name.slice(0, -1)}" to create your first entry.`}
          />
        ) : (
          <DataTable
            data={sectionData}
            columns={getColumnConfig() as any}
            loading={sectionLoading}
            error={sectionError}
            onAdd={canEdit && !permissionsLoading ? handleAdd : undefined}
            onEdit={canEdit && !permissionsLoading ? handleEdit : undefined}
            onDelete={canEdit && !permissionsLoading ? handleDelete : undefined}
            onRefresh={handleRefresh}
            searchPlaceholder={`Search ${sectionConfig.name.toLowerCase()}...`}
            addButtonText={`Add ${sectionConfig.name.slice(0, -1)}`} // Remove 's' from plural
            emptyMessage={`No ${sectionConfig.name.toLowerCase()} found. Click "Add ${sectionConfig.name.slice(0, -1)}" to create your first entry.`}
          />
        )}
      </div>
    </div>
  )
}
