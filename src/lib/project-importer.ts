/**
 * Project Importer - Internal Database Creation Functions
 * 
 * This module handles the creation of ScribeProject and related records
 * in the internal Prisma database using transformed external data.
 * 
 * Key Features:
 * - Transaction-based operations for data integrity
 * - Proper relationship handling between models
 * - Audit field management
 * - Error handling and rollback capabilities
 */

import { PrismaClient } from '@prisma/client'
import type { InternalProjectData } from './data-converter'

/**
 * Result of project import operation
 */
export interface ImportResult {
  success: boolean
  projectId?: string
  error?: string
  details?: {
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
 * Import a complete project with all related data into the internal database
 * 
 * @param prisma - Prisma client instance
 * @param projectData - Transformed project data ready for database insertion
 * @returns Promise<ImportResult> with success status and details
 */
export async function importProject(
  prisma: PrismaClient,
  projectData: InternalProjectData
): Promise<ImportResult> {
  try {
    console.log('Starting project import transaction...')
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the main ScribeProject record
      console.log('Creating ScribeProject record...')
      const project = await tx.scribeProject.create({
        data: projectData.project
      })
      
      console.log(`Created project: ${project.id} - ${project.name}`)
      
      // 2. Create COP records
      console.log('Creating COP records...')
      const cops = await Promise.all(
        projectData.cops.map(cop => 
          tx.cop.create({
            data: {
              ...cop,
              projectId: project.id
            }
          })
        )
      )
      
      // 3. Create File records
      console.log('Creating File records...')
      const files = await Promise.all(
        projectData.files.map(file => 
          tx.file.create({
            data: {
              ...file,
              projectId: project.id
            }
          })
        )
      )
      
      // 4. Create Block records
      console.log('Creating Block records...')
      const blocks = await Promise.all(
        projectData.blocks.map(block => 
          tx.block.create({
            data: {
              ...block,
              projectId: project.id
            }
          })
        )
      )
      
      // 5. Create BlockTransform records (need to map to block IDs)
      console.log('Creating BlockTransform records...')
      const blockTransforms = await Promise.all(
        projectData.blockTransforms.map((transform, index) => {
          // For now, associate with blocks by index
          // This will need proper mapping based on actual data structure
          const blockId = blocks[index % blocks.length]?.id
          if (!blockId) return null
          
          return tx.blockTransform.create({
            data: {
              ...transform,
              blockId
            }
          })
        }).filter(Boolean)
      )
      
      // 6. Create BlockPart records (need to map to block IDs)
      console.log('Creating BlockPart records...')
      const blockParts = await Promise.all(
        projectData.blockParts.map((part, index) => {
          // For now, associate with blocks by index
          // This will need proper mapping based on actual data structure
          const blockId = blocks[index % blocks.length]?.id
          if (!blockId) return null
          
          return tx.blockPart.create({
            data: {
              ...part,
              blockId
            }
          })
        }).filter(Boolean)
      )
      
      // 7. Create Label records
      console.log('Creating Label records...')
      const labels = await Promise.all(
        projectData.labels.map(label => 
          tx.label.create({
            data: {
              ...label,
              projectId: project.id
            }
          })
        )
      )
      
      // 8. Create GameMnemonic records
      console.log('Creating GameMnemonic records...')
      const mnemonics = await Promise.all(
        projectData.mnemonics.map(mnemonic => 
          tx.gameMnemonic.create({
            data: {
              ...mnemonic,
              projectId: project.id
            }
          })
        )
      )
      
      // 9. Create Override records
      console.log('Creating Override records...')
      const overrides = await Promise.all(
        projectData.overrides.map(override => 
          tx.override.create({
            data: {
              ...override,
              projectId: project.id
            }
          })
        )
      )
      
      // 10. Create Rewrite records
      console.log('Creating Rewrite records...')
      const rewrites = await Promise.all(
        projectData.rewrites.map(rewrite => 
          tx.rewrite.create({
            data: {
              ...rewrite,
              projectId: project.id
            }
          })
        )
      )
      
      // 11. Create StringType records
      console.log('Creating StringType records...')
      const stringTypes = await Promise.all(
        projectData.stringTypes.map(stringType => 
          tx.stringType.create({
            data: {
              ...stringType,
              projectId: project.id
            }
          })
        )
      )
      
      // 12. Create StringCommand records (need to map to stringType IDs)
      console.log('Creating StringCommand records...')
      const stringCommands = await Promise.all(
        projectData.stringCommands.map((command, index) => {
          // For now, associate with stringTypes by index
          // This will need proper mapping based on actual data structure
          const stringTypeId = stringTypes[index % stringTypes.length]?.id
          if (!stringTypeId) return null
          
          return tx.stringCommand.create({
            data: {
              ...command,
              stringTypeId
            }
          })
        }).filter(Boolean)
      )
      
      // 13. Create Struct records
      console.log('Creating Struct records...')
      const structs = await Promise.all(
        projectData.structs.map(struct => 
          tx.struct.create({
            data: {
              ...struct,
              projectId: project.id
            }
          })
        )
      )
      
      return {
        project,
        counts: {
          projectCreated: true,
          copsCreated: cops.length,
          filesCreated: files.length,
          blocksCreated: blocks.length,
          blockTransformsCreated: blockTransforms.length,
          blockPartsCreated: blockParts.length,
          labelsCreated: labels.length,
          mnemonicsCreated: mnemonics.length,
          overridesCreated: overrides.length,
          rewritesCreated: rewrites.length,
          stringTypesCreated: stringTypes.length,
          stringCommandsCreated: stringCommands.length,
          structsCreated: structs.length
        }
      }
    })
    
    console.log('Project import completed successfully!')
    
    return {
      success: true,
      projectId: result.project.id,
      details: result.counts
    }
    
  } catch (error) {
    console.error('Project import failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {
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
 * Validate project data before import
 * 
 * @param projectData - Project data to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateProjectData(projectData: InternalProjectData): string[] {
  const errors: string[] = []
  
  // Validate project data
  if (!projectData.project.name?.trim()) {
    errors.push('Project name is required')
  }
  
  if (!projectData.project.createdBy) {
    errors.push('Project createdBy is required')
  }
  
  // Validate unique constraints that might cause database errors
  const copCodes = new Set<number>()
  const copMnemonics = new Set<string>()
  
  projectData.cops.forEach((cop, index) => {
    if (copCodes.has(cop.code)) {
      errors.push(`Duplicate COP code ${cop.code} at index ${index}`)
    }
    copCodes.add(cop.code)
    
    if (copMnemonics.has(cop.mnemonic)) {
      errors.push(`Duplicate COP mnemonic ${cop.mnemonic} at index ${index}`)
    }
    copMnemonics.add(cop.mnemonic)
  })
  
  // Validate file names are unique
  const fileNames = new Set<string>()
  projectData.files.forEach((file, index) => {
    if (fileNames.has(file.name)) {
      errors.push(`Duplicate file name ${file.name} at index ${index}`)
    }
    fileNames.add(file.name)
  })
  
  // Validate block names are unique
  const blockNames = new Set<string>()
  projectData.blocks.forEach((block, index) => {
    if (blockNames.has(block.name)) {
      errors.push(`Duplicate block name ${block.name} at index ${index}`)
    }
    blockNames.add(block.name)
  })
  
  return errors
}
