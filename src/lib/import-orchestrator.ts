/**
 * Import Orchestrator - Main Service for External Project Import
 * 
 * This service coordinates the complete import workflow:
 * 1. Fetch external data from Supabase API
 * 2. Transform data to internal format
 * 3. Validate transformed data
 * 4. Create internal database records
 * 5. Handle errors and provide feedback
 */

import { createId } from '@paralleldrive/cuid2'
import { db, createWorkingClient } from './supabase'
import { convertExternalToInternal, type CompleteGameRomData } from './data-converter'
import { validateProjectData } from './project-importer'

/**
 * Progress callback for import operations
 */
export type ImportProgressCallback = (step: string, progress: number, total: number) => void

/**
 * Test function to verify Block conversion is working
 */
export async function testBlockConversion(gameRomBranchId: string): Promise<{
  success: boolean
  blockCount: number
  blockTransformCount: number
  blockPartCount: number
  error?: string
  blockNames?: string[]
}> {
  try {
    console.log('Testing Block conversion for GameRomBranch:', gameRomBranchId)

    // Step 1: Fetch external data
    const { data: externalData, error: fetchError } = await db.external.getGameRomBranchById(gameRomBranchId)

    if (fetchError || !externalData) {
      return {
        success: false,
        blockCount: 0,
        blockTransformCount: 0,
        blockPartCount: 0,
        error: `Failed to fetch external data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
      }
    }

    // Step 2: Convert data
    const internalData = convertExternalToInternal(externalData, 'test-user-id', 'Test Project', 'test-platform-id', 'test-gamerom-branch-id')

    // Step 3: Return results
    return {
      success: true,
      blockCount: internalData.blocks.length,
      blockTransformCount: internalData.blockTransforms.length,
      blockPartCount: internalData.blockParts.length,
      blockNames: internalData.blocks.map((block: any) => block.name)
    }
  } catch (error) {
    console.error('Error testing Block conversion:', error)
    return {
      success: false,
      blockCount: 0,
      blockTransformCount: 0,
      blockPartCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Complete import service result
 */
export interface ImportServiceResult {
  success: boolean
  projectId?: string
  projectName?: string
  error?: string
  validationErrors?: string[]
  importDetails?: {
    projectCreated: boolean
    copsCreated: number
    filesCreated: number
    blocksCreated: number
    blockTransformsCreated: number
    blockPartsCreated: number
    labelsCreated: number
    mnemonicsCreated: number
    overridesCreated: number
    rewritesCreated: number
    stringTypesCreated: number
    stringCommandsCreated: number
    structsCreated: number
  }
}

/**
 * Main orchestration service for importing external projects
 */
export class ImportOrchestrator {
  constructor() {
    // No dependencies needed - uses Supabase client directly
  }
  
  /**
   * Import a complete project from external GameRomBranch
   *
   * @param gameRomBranchId - External GameRomBranch ID to import
   * @param userId - ID of the user performing the import
   * @param projectName - Name for the new project
   * @param onProgress - Optional progress callback
   * @returns Promise<ImportServiceResult>
   */
  async importExternalGameRomBranch(
    gameRomBranchId: string,
    userId: string,
    projectName: string,
    platformId: string,
    onProgress?: ImportProgressCallback
  ): Promise<ImportServiceResult> {
    try {
      onProgress?.('Fetching external GameRomBranch data...', 1, 6)

      // Step 1: Fetch complete external GameRomBranch data
      console.log('Fetching external GameRomBranch data for:', gameRomBranchId)
      const { data: gameRomBranchData, error: fetchError } = await db.external.getGameRomBranchById(gameRomBranchId)

      if (fetchError || !gameRomBranchData) {
        return {
          success: false,
          error: `Failed to fetch external GameRomBranch data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        }
      }

      // Create the complete data structure
      const externalData: CompleteGameRomData = {
        gameRomBranch: gameRomBranchData,
        platformBranch: gameRomBranchData.platformBranch,
        platform: gameRomBranchData.platformBranch.platform,
        gameRom: gameRomBranchData.gameRom,
        game: gameRomBranchData.gameRom.game,
        region: gameRomBranchData.gameRom.region
      }

      onProgress?.('Transforming data to internal format...', 2, 6)

      // Step 2: Transform external data to internal format
      console.log('Converting external data to internal format...')
      const internalData = convertExternalToInternal(externalData, userId, projectName, platformId, gameRomBranchId)
      
      onProgress?.('Validating transformed data...', 3, 6)
      
      // Step 3: Validate transformed data
      console.log('Validating transformed data...')
      const validationErrors = validateProjectData(internalData)
      
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Data validation failed',
          validationErrors
        }
      }
      
      onProgress?.('Checking for existing project...', 4, 6)

      // Step 4: Check if project with same name already exists
      const { data: existingProject } = await db.projects.getByName(internalData.project.name)

      if (existingProject && existingProject.length > 0) {
        return {
          success: false,
          error: `A project with the name "${internalData.project.name}" already exists`
        }
      }

      onProgress?.('Creating internal database records...', 5, 6)

      // Step 5: Import data into internal database using Supabase
      console.log('Importing data into internal database...')
      const importResult = await this.importProjectWithSupabase(internalData, userId)

      if (!importResult.success) {
        return {
          success: false,
          error: importResult.error,
          importDetails: importResult.importDetails
        }
      }
      
      onProgress?.('Import completed successfully!', 6, 6)
      
      return {
        success: true,
        projectId: importResult.projectId,
        projectName: internalData.project.name,
        importDetails: importResult.importDetails
      }

    } catch (error) {
      console.error('Import orchestration failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during import'
      }
    }
  }

  /**
   * Import project data using Supabase client
   *
   * @param internalData - Transformed project data
   * @param userId - User ID performing the import
   * @returns Promise<ImportServiceResult>
   */
  private async importProjectWithSupabase(
    internalData: any,
    userId: string
  ): Promise<ImportServiceResult> {
    try {
      console.log('Creating ScribeProject record with Supabase...')

      // Create a working Supabase client for database operations
      const supabase = createWorkingClient()

      // Create the main project record using the existing db.projects.create method
      const { data: newProject, error: createError } = await db.projects.create(
        {
          name: internalData.project.name,
          isPublic: internalData.project.isPublic,
          gameRomId: internalData.project.gameRomId,
          platformId: internalData.project.platformId,
          meta: internalData.project.meta
        },
        userId
      )

      if (createError || !newProject) {
        throw new Error(`Failed to create project: ${createError?.message || 'Unknown error'}`)
      }

      console.log(`Created project: ${newProject.id} - ${newProject.name}`)

      // Now insert all the extracted data records
      const importDetails = {
        projectCreated: true,
        copsCreated: 0,
        filesCreated: 0,
        blocksCreated: 0,
        blockTransformsCreated: 0,
        blockPartsCreated: 0,
        labelsCreated: 0,
        mnemonicsCreated: 0,
        overridesCreated: 0,
        rewritesCreated: 0,
        stringTypesCreated: 0,
        stringCommandsCreated: 0,
        structsCreated: 0
      }

      // Insert Files
      if (internalData.files && internalData.files.length > 0) {
        console.log(`Inserting ${internalData.files.length} files...`)
        const filesToInsert = internalData.files.map((file: any) => ({
          ...file,
          id: createId(),
          projectId: newProject.id,
          createdBy: userId
        }))

        const { error: filesError } = await supabase
          .from('File')
          .insert(filesToInsert)

        if (filesError) {
          console.error('Failed to insert files:', filesError)
        } else {
          importDetails.filesCreated = filesToInsert.length
          console.log(`Successfully inserted ${filesToInsert.length} files`)
        }
      }

      // Insert COPs
      if (internalData.cops && internalData.cops.length > 0) {
        console.log(`Inserting ${internalData.cops.length} COPs...`)
        const copsToInsert = internalData.cops.map((cop: any) => ({
          ...cop,
          id: createId(),
          projectId: newProject.id,
          createdBy: userId
        }))

        const { error: copsError } = await supabase
          .from('Cop')
          .insert(copsToInsert)

        if (copsError) {
          console.error('Failed to insert COPs:', copsError)
        } else {
          importDetails.copsCreated = copsToInsert.length
          console.log(`Successfully inserted ${copsToInsert.length} COPs`)
        }
      }

      // First, insert Block records
      if (internalData.blocks && internalData.blocks.length > 0) {
        console.log(`Inserting ${internalData.blocks.length} blocks...`)
        console.log('Block data preview:', internalData.blocks.slice(0, 2)) // Log first 2 blocks for debugging

        // Validate block data before insertion
        const validationErrors: string[] = []
        internalData.blocks.forEach((block: any, index: number) => {
          if (!block.name || typeof block.name !== 'string') {
            validationErrors.push(`Block ${index}: Missing or invalid name`)
          }
          if (block.name && block.name.length > 255) {
            validationErrors.push(`Block ${index}: Name too long (${block.name.length} chars)`)
          }
        })

        if (validationErrors.length > 0) {
          console.error('Block validation errors:', validationErrors)
          throw new Error(`Block validation failed: ${validationErrors.join(', ')}`)
        }

        const blocksToInsert = internalData.blocks.map((block: any) => {
          block.id = createId();

          return {
            id: block.id,
            name: block.name,
            movable: block.movable || false,
            group: block.group || null,
            scene: block.scene || null,
            postProcess: block.postProcess || null,
            meta: block.meta || null,
            projectId: newProject.id,
            createdBy: userId
          }
        })

        const { error: blocksError } = await supabase
          .from('Block')
          .insert(blocksToInsert)

        if (blocksError) {
          throw new Error(`Failed to insert blocks: ${blocksError.message}`)
        }

        importDetails.blocksCreated = blocksToInsert.length
      } else {
        console.log('No blocks to insert')
      }

      // Insert BlockTransforms (after blocks are created)
      if (internalData.blockTransforms && internalData.blockTransforms.length > 0) {
        console.log(`Inserting ${internalData.blockTransforms.length} block transforms...`)
        const blockTransformsToInsert = internalData.blockTransforms
          .map((transform: any) => {
            // Map blockName to actual block ID
            const blockId = transform.block.id;

            return {
              id: createId(),
              regex: transform.regex,
              replacement: transform.replacement,
              blockId,
              createdBy: userId
            }
          })
          .filter(Boolean) // Remove null entries

        if (blockTransformsToInsert.length > 0) {
          const { error: transformsError } = await supabase
            .from('BlockTransform')
            .insert(blockTransformsToInsert)

          if (transformsError) {
            throw new Error(`Failed to insert block transforms: ${transformsError.message}`)
          }

          importDetails.blockTransformsCreated = blockTransformsToInsert.length
        }
      }

      // Insert BlockParts (after blocks are created)
      if (internalData.blockParts && internalData.blockParts.length > 0) {
        console.log(`Inserting ${internalData.blockParts.length} block parts...`)
        const blockPartsToInsert = internalData.blockParts
          .map((part: any) => {
            // Map blockName to actual block ID
            const blockId = part.block.id;

            return {
              id: createId(),
              name: part.name,
              location: part.location,
              size: part.size,
              type: part.type,
              index: part.index,
              blockId,
              createdBy: userId
            }
          })
          .filter(Boolean) // Remove null entries

        if (blockPartsToInsert.length > 0) {
          const { error: partsError } = await supabase
            .from('BlockPart')
            .insert(blockPartsToInsert)

          if (partsError) {
            throw new Error(`Failed to insert block parts: ${partsError.message}`)
          }

          importDetails.blockPartsCreated = blockPartsToInsert.length
        }
      }

      // Insert Labels
      if (internalData.labels && internalData.labels.length > 0) {
        console.log(`Inserting ${internalData.labels.length} labels...`)
        const labelsToInsert = internalData.labels.map((label: any) => ({
          ...label,
          id: createId(),
          projectId: newProject.id,
          createdBy: userId
        }))

        const { error: labelsError } = await supabase
          .from('Label')
          .insert(labelsToInsert)

        if (labelsError) {
          console.error('Failed to insert labels:', labelsError)
        } else {
          importDetails.labelsCreated = labelsToInsert.length
          console.log(`Successfully inserted ${labelsToInsert.length} labels`)
        }
      }

      // Insert Mnemonics
      if (internalData.mnemonics && internalData.mnemonics.length > 0) {
        console.log(`Inserting ${internalData.mnemonics.length} mnemonics...`)
        const mnemonicsToInsert = internalData.mnemonics.map((mnemonic: any) => ({
          ...mnemonic,
          id: createId(),
          projectId: newProject.id,
          createdBy: userId
        }))

        const { error: mnemonicsError } = await supabase
          .from('GameMnemonic')
          .insert(mnemonicsToInsert)

        if (mnemonicsError) {
          console.error('Failed to insert mnemonics:', mnemonicsError)
        } else {
          importDetails.mnemonicsCreated = mnemonicsToInsert.length
          console.log(`Successfully inserted ${mnemonicsToInsert.length} mnemonics`)
        }
      }

      // Insert Overrides
      if (internalData.overrides && internalData.overrides.length > 0) {
        console.log(`Inserting ${internalData.overrides.length} overrides...`)
        const overridesToInsert = internalData.overrides.map((override: any) => ({
          ...override,
          id: createId(),
          projectId: newProject.id,
          createdBy: userId
        }))

        const { error: overridesError } = await supabase
          .from('Override')
          .insert(overridesToInsert)

        if (overridesError) {
          console.error('Failed to insert overrides:', overridesError)
        } else {
          importDetails.overridesCreated = overridesToInsert.length
          console.log(`Successfully inserted ${overridesToInsert.length} overrides`)
        }
      }

      // Insert Rewrites
      if (internalData.rewrites && internalData.rewrites.length > 0) {
        console.log(`Inserting ${internalData.rewrites.length} rewrites...`)
        const rewritesToInsert = internalData.rewrites.map((rewrite: any) => ({
          ...rewrite,
          id: createId(),
          projectId: newProject.id,
          createdBy: userId
        }))

        const { error: rewritesError } = await supabase
          .from('Rewrite')
          .insert(rewritesToInsert)

        if (rewritesError) {
          console.error('Failed to insert rewrites:', rewritesError)
        } else {
          importDetails.rewritesCreated = rewritesToInsert.length
          console.log(`Successfully inserted ${rewritesToInsert.length} rewrites`)
        }
      }

      // Insert StringTypes and StringCommands
      const stringTypeNameToIdMapping: { [stringTypeName: string]: string } = {}

      // First, insert StringType records
      if (internalData.stringTypes && internalData.stringTypes.length > 0) {
        console.log(`Inserting ${internalData.stringTypes.length} string types...`)
        const stringTypesToInsert = internalData.stringTypes.map((stringType: any) => {
          const stringTypeId = createId()
          // Store mapping from string type name to actual database ID
          stringTypeNameToIdMapping[stringType.name] = stringTypeId

          return {
            id: stringTypeId,
            name: stringType.name,
            delimiter: stringType.delimiter,
            shiftType: stringType.shiftType,
            terminator: stringType.terminator,
            greedy: stringType.greedy,
            meta: stringType.meta,
            characterMap: stringType.characterMap || [],
            projectId: newProject.id,
            createdBy: userId
          }
        })

        const { error: stringTypesError } = await supabase
          .from('StringType')
          .insert(stringTypesToInsert)

        if (stringTypesError) {
          console.error('Failed to insert string types:', stringTypesError)
        } else {
          importDetails.stringTypesCreated = stringTypesToInsert.length
          console.log(`Successfully inserted ${stringTypesToInsert.length} string types`)
        }
      }

      // Insert StringCommands (after string types are created)
      if (internalData.stringCommands && internalData.stringCommands.length > 0) {
        console.log(`Inserting ${internalData.stringCommands.length} string commands...`)
        const stringCommandsToInsert = internalData.stringCommands
          .map((command: any) => {
            // Map stringTypeName to actual string type ID
            const stringTypeId = stringTypeNameToIdMapping[command.stringTypeName]
            if (!stringTypeId) {
              console.warn(`No string type ID found for string type name: ${command.stringTypeName}`)
              return null
            }

            return {
              id: createId(),
              code: command.code,
              mnemonic: command.mnemonic,
              types: command.types || [],
              delimiter: command.delimiter,
              halt: command.halt,
              parts: command.parts || [],
              meta: command.meta,
              stringTypeId,
              createdBy: userId
            }
          })
          .filter(Boolean) // Remove null entries

        if (stringCommandsToInsert.length > 0) {
          const { error: stringCommandsError } = await supabase
            .from('StringCommand')
            .insert(stringCommandsToInsert)

          if (stringCommandsError) {
            console.error('Failed to insert string commands:', stringCommandsError)
          } else {
            importDetails.stringCommandsCreated = stringCommandsToInsert.length
            console.log(`Successfully inserted ${stringCommandsToInsert.length} string commands`)
          }
        }
      }

      // Insert Structs
      if (internalData.structs && internalData.structs.length > 0) {
        console.log(`Inserting ${internalData.structs.length} structs...`)
        const structsToInsert = internalData.structs.map((struct: any) => ({
          ...struct,
          id: createId(),
          projectId: newProject.id,
          createdBy: userId
        }))

        const { error: structsError } = await supabase
          .from('Struct')
          .insert(structsToInsert)

        if (structsError) {
          console.error('Failed to insert structs:', structsError)
        } else {
          importDetails.structsCreated = structsToInsert.length
          console.log(`Successfully inserted ${structsToInsert.length} structs`)
        }
      }

      return {
        success: true,
        projectId: newProject.id,
        importDetails
      }

    } catch (error) {
      console.error('Supabase import failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        importDetails: {
          projectCreated: false,
          copsCreated: 0,
          filesCreated: 0,
          blocksCreated: 0,
          blockTransformsCreated: 0,
          blockPartsCreated: 0,
          labelsCreated: 0,
          mnemonicsCreated: 0,
          overridesCreated: 0,
          rewritesCreated: 0,
          stringTypesCreated: 0,
          stringCommandsCreated: 0,
          structsCreated: 0
        }
      }
    }
  }
  
  /**
   * Get external project summary for preview before import
   * 
   * @param projectBranchId - External project branch ID
   * @returns Promise with project summary data
   */
  async getExternalProjectSummary(projectBranchId: string) {
    try {
      console.log('Fetching external project summary for:', projectBranchId)
      
      const { data: projectBranch, error } = await db.external.getProjectBranchById(projectBranchId)
      
      if (error || !projectBranch) {
        return {
          success: false,
          error: `Failed to fetch project summary: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
      
      return {
        success: true,
        data: {
          id: projectBranch.id,
          name: projectBranch.project?.name || 'Unknown Project',
          branchName: projectBranch.name,
          branchVersion: projectBranch.version,
          baseRomBranchId: projectBranch.baseRomBranchId,
          createdAt: projectBranch.createdAt,
          updatedAt: projectBranch.updatedAt
        }
      }
      
    } catch (error) {
      console.error('Failed to get project summary:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Validate that an external project can be imported
   * 
   * @param projectBranchId - External project branch ID
   * @returns Promise with validation result
   */
  // async validateExternalProject(projectBranchId: string) {
  //   try {
  //     console.log('Validating external project for import:', projectBranchId)
      
  //     // Check if we can fetch the complete project data
  //     const { data: externalData, error: fetchError } = await db.external.getCompleteProjectData(projectBranchId)
      
  //     if (fetchError || !externalData) {
  //       return {
  //         success: false,
  //         error: `Cannot fetch project data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
  //       }
  //     }
      
  //     // Check if project name would conflict
  //     const projectName = externalData.projectBranch.project?.name || `Imported Project ${projectBranchId}`
  //     const { data: existingProjects } = await db.projects.getByName(projectName)

  //     if (existingProjects && existingProjects.length > 0) {
  //       return {
  //         success: false,
  //         error: `A project with the name "${projectName}" already exists`
  //       }
  //     }
      
  //     return {
  //       success: true,
  //       projectName,
  //       message: 'Project can be imported successfully'
  //     }
      
  //   } catch (error) {
  //     console.error('Project validation failed:', error)
      
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error occurred during validation'
  //     }
  //   }
  // }
}

/**
 * Create a new import orchestrator instance
 *
 * @returns ImportOrchestrator instance
 */
export function createImportOrchestrator(): ImportOrchestrator {
  return new ImportOrchestrator()
}

/**
 * Convenience function for one-off imports
 *
 * @param gameRomBranchId - External GameRomBranch ID
 * @param userId - User ID performing the import
 * @param projectName - Name for the new project
 * @param onProgress - Optional progress callback
 * @returns Promise<ImportServiceResult>
 */
export async function importExternalGameRomBranch(
  gameRomBranchId: string,
  userId: string,
  projectName: string,
  platformId: string,
  onProgress?: ImportProgressCallback
): Promise<ImportServiceResult> {
  const orchestrator = createImportOrchestrator()
  return orchestrator.importExternalGameRomBranch(gameRomBranchId, userId, projectName, platformId, onProgress)
}
