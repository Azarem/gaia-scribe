import type {
  ProjectBranchData,
  GameRomBranchData,
  PlatformBranchData
} from '@gaialabs/shared'

// External API configuration (using HTTP requests instead of Supabase client)
const EXTERNAL_SUPABASE_URL = 'https://adwobxutnpmjbmhdxrzx.supabase.co'
const EXTERNAL_SUPABASE_KEY = 'sb_publishable_uBZdKmgGql5sDNGpj1DVMQ_opZ2V4kV'

export const external = {
  async searchGameRomBranches(searchQuery?: string) {
    try {
      // Search GameRomBranches with game name filtering
      let url = `${EXTERNAL_SUPABASE_URL}/rest/v1/GameRomBranch?select=*,gameRom:GameRom!inner(id,crc,meta,gameId,regionId,game:Game!inner(id,name),region:Region!inner(id,name,meta,platformId)),platformBranch:PlatformBranch!inner(id,name,version,platformId,addressingModes,instructionSet,vectors,platform:Platform!inner(id,name,meta))&order=updatedAt.desc&limit=20`

      if (searchQuery?.trim()) {
        // Filter by game name using the joined game table
        url += `&gameRom.game.name=ilike.%25${encodeURIComponent(searchQuery.trim())}%25`
      }

      const response = await fetch(url, {
        headers: {
          'apikey': EXTERNAL_SUPABASE_KEY,
          'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as GameRomBranchData[]

      return { data, error: null }
    } catch (error) {
      console.error('Error searching external GameRomBranches:', error)
      return { data: null, error }
    }
  },

  async searchProjectBranches(searchQuery?: string) {
    try {
      // Use the existing search functionality from the current implementation
      // This maintains compatibility while we transition to @gaialabs/shared functions
      let url = `${EXTERNAL_SUPABASE_URL}/rest/v1/ProjectBranch?select=*,project:Project!inner(id,name,meta,gameId,baseRomId,createdAt,updatedAt)&order=updatedAt.desc&limit=20`

      if (searchQuery?.trim()) {
        // Filter by project name using the joined project table
        url += `&project.name=ilike.%25${encodeURIComponent(searchQuery.trim())}%25`
      }

      const response = await fetch(url, {
        headers: {
          'apikey': EXTERNAL_SUPABASE_KEY,
          'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as ProjectBranchData[]

      return { data, error: null }
    } catch (error) {
      console.error('Error searching external projects:', error)
      return { data: null, error }
    }
  },

  async getProjectBranchById(id: string) {
    try {
      // Include project data with name field using proper JOIN
      const url = `${EXTERNAL_SUPABASE_URL}/rest/v1/ProjectBranch?select=*,project:Project!inner(id,name,meta,gameId,baseRomId,createdAt,updatedAt)&id=eq.${encodeURIComponent(id)}&limit=1`

      const response = await fetch(url, {
        headers: {
          'apikey': EXTERNAL_SUPABASE_KEY,
          'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const branch = data[0]

      return { data: branch || null, error: null }
    } catch (error) {
      console.error('Error fetching external project:', error)
      return { data: null, error }
    }
  },

  // Comprehensive data fetching for complete project import
  async getGameRomBranchById(gameRomBranchId: string) {
    try {
      console.log('Fetching GameRomBranch data for:', gameRomBranchId)

      // Fetch GameRomBranch with all nested relationships needed for import
      const url = `${EXTERNAL_SUPABASE_URL}/rest/v1/GameRomBranch?select=*,gameRom:GameRom!inner(id,crc,meta,gameId,regionId,game:Game!inner(id,name),region:Region!inner(id,name,meta,platformId)),platformBranch:PlatformBranch!inner(id,name,version,platformId,addressingModes,instructionSet,vectors,types,platform:Platform!inner(id,name,meta))&id=eq.${encodeURIComponent(gameRomBranchId)}&limit=1`

      const response = await fetch(url, {
        headers: {
          'apikey': EXTERNAL_SUPABASE_KEY,
          'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { data: data[0] || null, error: null }
    } catch (error) {
      console.error('Error fetching GameRomBranch:', error)
      return { data: null, error }
    }
  },

  // Platform Branch search and import methods
  async searchPlatformBranches(searchQuery?: string) : Promise<{data: PlatformBranchData[] | null, error: Error | null}> {
    try {
      // Search PlatformBranches with platform name filtering
      let url = `${EXTERNAL_SUPABASE_URL}/rest/v1/PlatformBranch?select=*,platform:Platform!inner(id,name,meta)&order=updatedAt.desc&limit=20`

      if (searchQuery?.trim()) {
        // Filter by platform name using the joined platform table
        url += `&platform.name=ilike.%25${encodeURIComponent(searchQuery.trim())}%25`
      }

      const response = await fetch(url, {
        headers: {
          'apikey': EXTERNAL_SUPABASE_KEY,
          'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { data, error: null }
    } catch (error) {
      console.error('Error searching PlatformBranches:', error)
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }
  },

  async getPlatformBranchById(id: string) : Promise<{data: PlatformBranchData | null, error: Error | null}> {
    try {
      // Include platform data with name field using proper JOIN
      const url = `${EXTERNAL_SUPABASE_URL}/rest/v1/PlatformBranch?select=*,platform:Platform!inner(id,name,meta)&id=eq.${encodeURIComponent(id)}&limit=1`

      const response = await fetch(url, {
        headers: {
          'apikey': EXTERNAL_SUPABASE_KEY,
          'Authorization': `Bearer ${EXTERNAL_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const platformBranch = data?.[0]

      if (!platformBranch) {
        throw new Error('PlatformBranch not found')
      }

      return { data: platformBranch, error: null }
    } catch (error) {
      console.error('Error fetching PlatformBranch:', error)
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }
  }
}

