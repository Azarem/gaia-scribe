/**
 * Platform Import Orchestrator - Service for External PlatformBranch Import
 * 
 * This service coordinates the complete platform import workflow:
 * 1. Fetch external PlatformBranch data from Supabase API
 * 2. Transform data to internal Platform format
 * 3. Validate transformed data
 * 4. Create internal database records
 * 5. Handle errors and provide feedback
 */

import { db } from './supabase'
import { logger } from './logger'

/**
 * Progress callback for import operations
 */
export type PlatformImportProgressCallback = (step: string, progress: number, total: number) => void

/**
 * Result of platform import operation
 */
export interface PlatformImportResult {
  success: boolean
  platformId?: string
  platformName?: string
  error?: string
}

/**
 * External PlatformBranch data structure
 */
export interface ExternalPlatformBranchData {
  id: string
  name: string
  version: string
  platformId: string
  addressingModes: any
  instructionSet: any
  vectors: any
  platform: {
    id: string
    name: string
    meta: any
  }
  createdAt: string
  updatedAt: string
}

/**
 * Transform external PlatformBranch data to internal Platform format
 */
export function transformPlatformBranchToInternal(
  externalData: ExternalPlatformBranchData,
  _userId: string,
  platformName: string
) {
  return {
    name: platformName,
    isPublic: false, // Always private by default
    meta: {
      importedFrom: 'platformBranch',
      originalPlatformBranchId: externalData.id,
      originalPlatformId: externalData.platformId,
      originalPlatformName: externalData.platform.name,
      branchName: externalData.name,
      branchVersion: externalData.version,
      
      // Platform technical configuration
      addressingModes: externalData.addressingModes,
      instructionSet: externalData.instructionSet,
      vectors: externalData.vectors,
      
      // Original platform metadata
      originalPlatformMeta: externalData.platform.meta,
      
      // Import metadata
      importedAt: new Date().toISOString(),
      importSource: 'external-platform-branch'
    }
  }
}

/**
 * Validate platform data before import
 */
export function validatePlatformData(platformData: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!platformData.name || typeof platformData.name !== 'string' || platformData.name.trim().length === 0) {
    errors.push('Platform name is required')
  }

  if (platformData.name && platformData.name.length > 100) {
    errors.push('Platform name must be 100 characters or less')
  }

  if (typeof platformData.isPublic !== 'boolean') {
    errors.push('isPublic must be a boolean value')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Platform Import Orchestrator Class
 */
export class PlatformImportOrchestrator {
  /**
   * Import a complete platform from external PlatformBranch
   *
   * @param platformBranchId - External PlatformBranch ID to import
   * @param userId - ID of the user performing the import
   * @param platformName - Name for the new platform
   * @param onProgress - Optional progress callback
   * @returns Promise<PlatformImportResult>
   */
  async importExternalPlatformBranch(
    platformBranchId: string,
    userId: string,
    platformName: string,
    onProgress?: PlatformImportProgressCallback
  ): Promise<PlatformImportResult> {
    try {
      onProgress?.('Fetching external PlatformBranch data...', 1, 4)

      // Step 1: Fetch complete external PlatformBranch data
      logger.platform.import('Fetching external PlatformBranch data', { platformBranchId })
      const { data: platformBranchData, error: fetchError } = await db.external.getPlatformBranchById(platformBranchId)

      if (fetchError || !platformBranchData) {
        return {
          success: false,
          error: `Failed to fetch external PlatformBranch data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        }
      }

      onProgress?.('Transforming platform data...', 2, 4)

      // Step 2: Transform external data to internal format
      logger.platform.import('Transforming PlatformBranch data to internal format')
      const internalPlatformData = transformPlatformBranchToInternal(
        platformBranchData,
        userId,
        platformName
      )

      onProgress?.('Validating platform data...', 3, 4)

      // Step 3: Validate transformed data
      logger.platform.import('Validating transformed platform data')
      const validation = validatePlatformData(internalPlatformData)
      
      if (!validation.valid) {
        return {
          success: false,
          error: `Platform data validation failed: ${validation.errors.join(', ')}`
        }
      }

      onProgress?.('Creating platform...', 4, 4)

      // Step 4: Create the platform in the database
      logger.platform.import('Creating platform in database')
      const { data: newPlatform, error: createError } = await db.platforms.create(
        internalPlatformData,
        userId
      )

      if (createError || !newPlatform) {
        return {
          success: false,
          error: `Failed to create platform: ${createError?.message || 'Unknown error'}`
        }
      }

      logger.platform.import('Platform import completed successfully', { platformId: newPlatform.id })

      return {
        success: true,
        platformId: newPlatform.id,
        platformName: newPlatform.name
      }

    } catch (error) {
      logger.platform.error('import orchestrator', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during import'
      }
    }
  }

  /**
   * Get external platform summary for preview before import
   * 
   * @param platformBranchId - External platform branch ID
   * @returns Promise with platform summary data
   */
  async getExternalPlatformSummary(platformBranchId: string) {
    try {
      logger.platform.import('Fetching external platform summary', { platformBranchId })
      
      const { data: platformBranch, error } = await db.external.getPlatformBranchById(platformBranchId)
      
      if (error || !platformBranch) {
        return {
          success: false,
          error: `Failed to fetch platform summary: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }

      return {
        success: true,
        data: {
          name: platformBranch.platform.name,
          branchName: platformBranch.name,
          version: platformBranch.version,
          addressingModesCount: Array.isArray(platformBranch.addressingModes) ? platformBranch.addressingModes.length : 0,
          instructionSetCount: Array.isArray(platformBranch.instructionSet) ? platformBranch.instructionSet.length : 0,
          vectorsCount: Array.isArray(platformBranch.vectors) ? platformBranch.vectors.length : 0,
          lastUpdated: platformBranch.updatedAt
        }
      }
    } catch (error) {
      logger.platform.error('fetching platform summary', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Validate that an external platform can be imported
   * 
   * @param platformBranchId - External platform branch ID
   * @returns Promise with validation result
   */
  async validateExternalPlatform(platformBranchId: string) {
    try {
      logger.platform.import('Validating external platform for import', { platformBranchId })
      
      // Check if we can fetch the complete platform data
      const { data: externalData, error: fetchError } = await db.external.getPlatformBranchById(platformBranchId)
      
      if (fetchError || !externalData) {
        return {
          success: false,
          error: `Cannot fetch platform data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        }
      }

      // Validate the external data structure
      if (!externalData.platform || !externalData.platform.name) {
        return {
          success: false,
          error: 'Invalid platform data: missing platform information'
        }
      }

      if (!externalData.name) {
        return {
          success: false,
          error: 'Invalid platform data: missing branch name'
        }
      }

      return {
        success: true,
        data: {
          platformName: externalData.platform.name,
          branchName: externalData.name,
          version: externalData.version
        }
      }
    } catch (error) {
      logger.platform.error('validating external platform', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Create a new platform import orchestrator instance
 */
export function createPlatformImportOrchestrator(): PlatformImportOrchestrator {
  return new PlatformImportOrchestrator()
}

/**
 * Convenience function for one-off platform imports
 *
 * @param platformBranchId - External PlatformBranch ID
 * @param userId - User ID performing the import
 * @param platformName - Name for the new platform
 * @param onProgress - Optional progress callback
 * @returns Promise<PlatformImportResult>
 */
export async function importExternalPlatformBranch(
  platformBranchId: string,
  userId: string,
  platformName: string,
  onProgress?: PlatformImportProgressCallback
): Promise<PlatformImportResult> {
  const orchestrator = createPlatformImportOrchestrator()
  return orchestrator.importExternalPlatformBranch(platformBranchId, userId, platformName, onProgress)
}
