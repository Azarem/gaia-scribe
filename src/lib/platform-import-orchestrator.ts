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

import { createWorkingClient } from './supabase'
import { db } from '../services/supabase'
import { logger } from './logger'
import { createId } from '@paralleldrive/cuid2'
import { PlatformBranchData } from '@gaialabs/shared'

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
  importDetails?: {
    platformCreated: boolean
    addressingModesCreated: number
    instructionGroupsCreated: number
    instructionCodesCreated: number
    vectorsCreated: number
    typesCreated: number
  }
}

/**
 * External PlatformBranch data structure
 */
// export interface ExternalPlatformBranchData {
//   id: string
//   name: string
//   version: string
//   platformId: string
//   addressingModes: any
//   instructionSet: any
//   vectors: any
//   platform: {
//     id: string
//     name: string
//     meta: any
//   }
//   createdAt: string
//   updatedAt: string
// }

/**
 * Transform external PlatformBranch data to internal Platform format with nested data
 */
export function transformPlatformBranchToInternal(
  externalData: PlatformBranchData,
  _userId: string,
  platformName: string
) {
  // Extract and transform addressing modes
  const addressingModes = typeof externalData.addressingModes === 'object'
    ? Object.entries(externalData.addressingModes).map(([modeName, modeData]: [string, any]) => ({
        name: modeName || '',
        code: modeData.shorthand || '',
        size: modeData.size || 1,
        format: modeData.formatString || null,
        pattern: modeData.parseRegex || null,
        meta: modeData.meta || null
      }))
    : []

  const instructionCodes : { groupName: string, modeName: string, code: number }[] = []

  // Extract and transform instruction groups
  const instructionGroups = typeof externalData.instructionSet === 'object'
    ? Object.entries(externalData.instructionSet).map(([groupName, groupData]: [string, any]) => 
      {
        if(typeof groupData === 'object') {
          for(const [modeName, code] of Object.entries(groupData)) {
            instructionCodes.push({
              groupName,
              modeName,
              code: code as number
            })
          }
        }
        return {
          name: groupName || '',
          meta: groupData.meta || null
        };
      })
    : []

  // Extract and transform vectors
  const vectors = typeof externalData.vectors === 'object'
    ? Object.entries(externalData.vectors).map(([vectorName, vectorData]: [string, any]) => ({
        name: vectorName || '',
        address: vectorData.id || 0,
        isEntryPoint: vectorData.entry || false,
        isRomHeader: vectorData.header || false,
        meta: {
          source: vectorData.meta || undefined
        }
      }))
    : []
    
  // Extract and transform vectors
  const types = typeof externalData.types === 'object'
  ? Object.entries(externalData.types).map(([typeName, typeData]: [string, any]) => ({
      ...typeData,
      name: typeName,
    }))
  : []

  return {
    platform: {
      name: platformName,
      isPublic: false, // Always private by default
      platformBranchId: externalData.id,
      meta: {
        importedFrom: 'platformBranch',
        originalPlatformBranchId: externalData.id,
        originalPlatformId: externalData.platformId,
        originalPlatformName: externalData.platform.name,
        branchName: externalData.name,
        branchVersion: externalData.version,

        // Original platform metadata
        originalPlatformMeta: externalData.platform.meta,

        // Import metadata
        importedAt: new Date().toISOString(),
        importSource: 'external-platform-branch'
      }
    },
    addressingModes,
    instructionGroups,
    instructionCodes,
    vectors,
    types
  }
}

/**
 * Validate platform data before import
 */
export function validatePlatformData(platformData: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!platformData.platform) {
    errors.push('Platform data is required')
    return { valid: false, errors }
  }

  const platform = platformData.platform

  if (!platform.name || typeof platform.name !== 'string' || platform.name.trim().length === 0) {
    errors.push('Platform name is required')
  }

  if (platform.name && platform.name.length > 100) {
    errors.push('Platform name must be 100 characters or less')
  }

  if (typeof platform.isPublic !== 'boolean') {
    errors.push('isPublic must be a boolean value')
  }

  // Validate addressing modes
  if (platformData.addressingModes && !Array.isArray(platformData.addressingModes)) {
    errors.push('Addressing modes must be an array')
  }

  // Validate instruction groups
  if (platformData.instructionGroups && !Array.isArray(platformData.instructionGroups)) {
    errors.push('Instruction groups must be an array')
  }

  // Validate vectors
  if (platformData.vectors && !Array.isArray(platformData.vectors)) {
    errors.push('Vectors must be an array')
  }

  // Validate instruction codes
  if (platformData.instructionCodes && !Array.isArray(platformData.instructionCodes)) {
    errors.push('Instruction codes must be an array')
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
   * Import a complete platform from external PlatformBranch with all nested data
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
      onProgress?.('Fetching external PlatformBranch data...', 1, 8)

      // Step 1: Fetch complete external PlatformBranch data
      logger.platform.import('Fetching external PlatformBranch data', { platformBranchId })
      const { data: platformBranchData, error: fetchError } = await db.external.getPlatformBranchById(platformBranchId)

      if (fetchError || !platformBranchData) {
        return {
          success: false,
          error: `Failed to fetch external PlatformBranch data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        }
      }

      onProgress?.('Transforming platform data...', 2, 8)

      // Step 2: Transform external data to internal format
      logger.platform.import('Transforming PlatformBranch data to internal format')
      const internalPlatformData = transformPlatformBranchToInternal(
        platformBranchData,
        userId,
        platformName
      )

      onProgress?.('Validating platform data...', 3, 8)

      // Step 3: Validate transformed data
      logger.platform.import('Validating transformed platform data')
      const validation = validatePlatformData(internalPlatformData)

      if (!validation.valid) {
        return {
          success: false,
          error: `Platform data validation failed: ${validation.errors.join(', ')}`
        }
      }

      onProgress?.('Creating platform...', 4, 8)

      // Step 4: Create the main platform record
      logger.platform.import('Creating platform in database')
      const { data: newPlatform, error: createError } = await db.platforms.create(
        internalPlatformData.platform,
        userId
      )

      if (createError || !newPlatform) {
        return {
          success: false,
          error: `Failed to create platform: ${createError?.message || 'Unknown error'}`
        }
      }

      logger.platform.import('Platform created successfully', { platformId: newPlatform.id })

      // Now import all the nested data structures
      return await this.importPlatformNestedData(
        newPlatform.id,
        internalPlatformData,
        userId,
        onProgress
      )

    } catch (error) {
      logger.platform.error('import orchestrator', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during import'
      }
    }
  }

  /**
   * Import all nested platform data structures
   *
   * @param platformId - ID of the created platform
   * @param internalData - Transformed platform data
   * @param userId - User ID performing the import
   * @param onProgress - Optional progress callback
   * @returns Promise<PlatformImportResult>
   */
  private async importPlatformNestedData(
    platformId: string,
    internalData: any,
    userId: string,
    onProgress?: PlatformImportProgressCallback
  ): Promise<PlatformImportResult> {
    try {
      const supabase = createWorkingClient()

      const importDetails = {
        platformCreated: true,
        addressingModesCreated: 0,
        instructionGroupsCreated: 0,
        instructionCodesCreated: 0,
        vectorsCreated: 0,
        typesCreated: 0
      }

      onProgress?.('Importing addressing modes...', 5, 8)

      // Step 5: Import Addressing Modes
      const addressingModeMap: { [key: string]: string } = {}
      if (internalData.addressingModes && internalData.addressingModes.length > 0) {
        logger.platform.import(`Importing ${internalData.addressingModes.length} addressing modes`)

        const addressingModesToInsert = internalData.addressingModes.map((mode: any) => {
          const id = createId();
          addressingModeMap[mode.name] = id;
          return {
            id,
            ...mode,
            platformId: platformId,
            createdBy: userId
          };
        });

        const { error: addressingModesError } = await supabase
          .from('AddressingMode')
          .insert(addressingModesToInsert)

        if (addressingModesError) {
          logger.platform.error('Failed to insert addressing modes', addressingModesError)
        } else {
          importDetails.addressingModesCreated = addressingModesToInsert.length
          logger.platform.import(`Successfully imported ${addressingModesToInsert.length} addressing modes`)
        }
      }

      onProgress?.('Importing instruction groups...', 6, 8)

      // Step 6: Import Instruction Groups
      const instructionGroupMap: { [key: string]: string } = {}
      if (internalData.instructionGroups && internalData.instructionGroups.length > 0) {
        logger.platform.import(`Importing ${internalData.instructionGroups.length} instruction groups`)

        const instructionGroupsToInsert = internalData.instructionGroups.map((group: any) => {
          const id = createId()
          instructionGroupMap[group.name] = id // Map name to ID for instruction codes
          return {
            id,
            ...group,
            platformId: platformId,
            createdBy: userId
          }
        })

        const { error: instructionGroupsError } = await supabase
          .from('InstructionGroup')
          .insert(instructionGroupsToInsert)

        if (instructionGroupsError) {
          logger.platform.error('Failed to insert instruction groups', instructionGroupsError)
        } else {
          importDetails.instructionGroupsCreated = instructionGroupsToInsert.length
          logger.platform.import(`Successfully imported ${instructionGroupsToInsert.length} instruction groups`)
        }
      }

      onProgress?.('Importing vectors...', 7, 8)

      // Step 7: Import Vectors
      if (internalData.vectors && internalData.vectors.length > 0) {
        logger.platform.import(`Importing ${internalData.vectors.length} vectors`)

        const vectorsToInsert = internalData.vectors.map((vector: any) => ({
          id: createId(),
          ...vector,
          platformId: platformId,
          createdBy: userId
        }))

        const { error: vectorsError } = await supabase
          .from('Vector')
          .insert(vectorsToInsert)

        if (vectorsError) {
          logger.platform.error('Failed to insert vectors', vectorsError)
        } else {
          importDetails.vectorsCreated = vectorsToInsert.length
          logger.platform.import(`Successfully imported ${vectorsToInsert.length} vectors`)
        }
      }

      onProgress?.('Importing instruction codes...', 8, 8)

      // Step 8: Import Instruction Codes (requires addressing modes and instruction groups)
      if (internalData.instructionCodes && internalData.instructionCodes.length > 0) {
        logger.platform.import(`Importing ${internalData.instructionCodes.length} instruction codes`)


        const instructionCodesToInsert = internalData.instructionCodes.map((code: any) => ({
          id: createId(),
          code: code.code,
          cycles: code.cycles,
          meta: code.meta,
          groupId: instructionGroupMap[code.groupName],
          modeId: addressingModeMap[code.modeName],
          createdBy: userId
        }));

        if (instructionCodesToInsert.length > 0) {
          const { error: instructionCodesError } = await supabase
            .from('InstructionCode')
            .insert(instructionCodesToInsert)

          if (instructionCodesError) {
            logger.platform.error('Failed to insert instruction codes', instructionCodesError)
          } else {
            importDetails.instructionCodesCreated = instructionCodesToInsert.length
            logger.platform.import(`Successfully imported ${instructionCodesToInsert.length} instruction codes`)
          }
        }
      }

      // Step 9: Import Platform Types
      if (internalData.types && internalData.types.length > 0) {
        logger.platform.import(`Importing ${internalData.types.length} platform types`)
        
        const platformTypesToInsert = internalData.types.map((type: any) => ({
          id: createId(),
          ...type,
          platformId: platformId,
          createdBy: userId
        }))
        
        const { error: platformTypesError } = await supabase
          .from('PlatformType')
          .insert(platformTypesToInsert)

        if (platformTypesError) {
          logger.platform.error('Failed to insert platform types', platformTypesError)
        } else {
          importDetails.typesCreated = platformTypesToInsert.length
          logger.platform.import(`Successfully imported ${platformTypesToInsert.length} platform types`)
        }
      }

      logger.platform.import('Platform import completed successfully', {
        platformId,
        importDetails
      })

      return {
        success: true,
        platformId: platformId,
        platformName: internalData.platform.name,
        importDetails
      }

    } catch (error) {
      logger.platform.error('importing platform nested data', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during nested data import'
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
  // async validateExternalPlatform(platformBranchId: string) {
  //   try {
  //     logger.platform.import('Validating external platform for import', { platformBranchId })
      
  //     // Check if we can fetch the complete platform data
  //     const { data: externalData, error: fetchError } = await db.external.getPlatformBranchById(platformBranchId)
      
  //     if (fetchError || !externalData) {
  //       return {
  //         success: false,
  //         error: `Cannot fetch platform data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
  //       }
  //     }

  //     // Validate the external data structure
  //     if (!externalData.platform || !externalData.platform.name) {
  //       return {
  //         success: false,
  //         error: 'Invalid platform data: missing platform information'
  //       }
  //     }

  //     if (!externalData.name) {
  //       return {
  //         success: false,
  //         error: 'Invalid platform data: missing branch name'
  //       }
  //     }

  //     return {
  //       success: true,
  //       data: {
  //         platformName: externalData.platform.name,
  //         branchName: externalData.name,
  //         version: externalData.version
  //       }
  //     }
  //   } catch (error) {
  //     logger.platform.error('validating external platform', error)
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error'
  //     }
  //   }
  // }
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
