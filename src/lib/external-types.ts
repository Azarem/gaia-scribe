// Re-export types from @gaialabs/shared for external Supabase API compatibility
// This ensures we use the standardized interfaces instead of duplicating definitions
export type {
  ProjectBranchData as ProjectBranch,
  ProjectData,
  ProjectFileData,
  ProjectPayload,
} from '@gaialabs/shared'

// Module-related types that are specific to this application
export interface ProjectModule {
  name: string
  groups: ModuleGroup[]
}

export interface ModuleGroup {
  name: string | null
  options: ModuleOption[]
}

export interface ModuleOption {
  name: string
  module: string | null
  default?: boolean
  description?: string
}

