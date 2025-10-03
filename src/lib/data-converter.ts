/**
 * Data Converter for External Supabase API to Internal Prisma Schema
 * 
 * This module transforms external API data structures from @gaialabs/shared
 * into internal Prisma database schema format for ScribeProject creation.
 * 
 * Key Principles:
 * - Use @gaialabs/shared types directly without transformation
 * - Map complex nested JSON structures to individual Prisma table records
 * - Maintain data integrity and relationships
 * - Handle audit fields (createdBy, updatedBy, createdAt, updatedAt)
 */


import type {
  GameRomBranchData,
  PlatformBranchData,
  PlatformData,
  GameRomData,
  GameData,
  RegionData
} from '@gaialabs/shared'

import type {
  ScribeProject,
  Cop,
  File,
  Block,
  BlockTransform,
  BlockPart,
  Label,
  GameMnemonic,
  Override,
  Rewrite,
  StringType,
  StringCommand,
  Struct
} from '@prisma/client'

/**
 * Complete project data structure from external API
 * Based on GameRomBranch as the primary data source
 */
export interface CompleteGameRomData {
  gameRomBranch: GameRomBranchData
  platformBranch: PlatformBranchData
  platform: PlatformData
  gameRom: GameRomData
  game: GameData
  region: RegionData
}

/**
 * Internal database creation data structure
 * Note: projectId will be set after the project is created
 */
export interface InternalProjectData {
  project: Omit<ScribeProject, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>
  cops: Omit<Cop, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  files: Omit<File, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  blocks: Omit<Block, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  blockTransforms: Omit<BlockTransform, 'id' | 'blockId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  blockParts: Omit<BlockPart, 'id' | 'blockId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  labels: Omit<Label, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  mnemonics: Omit<GameMnemonic, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  overrides: Omit<Override, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  rewrites: Omit<Rewrite, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  stringTypes: Omit<StringType, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  stringCommands: Omit<StringCommand, 'id' | 'stringTypeId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  structs: Omit<Struct, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
}

/**
 * Convert external GameRomBranch data to internal Prisma format
 *
 * @param externalData - Complete GameRomBranch data from external API
 * @param userId - ID of the user creating the project (for audit fields)
 * @param projectName - Name for the new project
 * @returns Internal project data ready for database insertion
 */
export function convertExternalToInternal(
  externalData: CompleteGameRomData,
  _userId: string,
  projectName: string,
  platformId: string,
  gameRomBranchId: string
): InternalProjectData {
  const { gameRomBranch, platformBranch, platform, gameRom, game, region } = externalData
  
  // Create the main ScribeProject record
  const project = {
    name: projectName,
    isPublic: false, // Default to private for imported projects
    gameRomBranchId: gameRomBranchId,
    platformId: platformId,

    // Store all external metadata in the meta JSON field
    meta: {
      // External reference data
      externalGameRomBranchId: gameRomBranch.id,
      externalPlatformBranchId: platformBranch.id,
      externalPlatformId: platform.id,
      externalGameRomId: gameRom.id,
      externalGameId: game.id,
      externalRegionId: region.id,

      // Platform and game metadata
      platformName: platform.name,
      platformMeta: platform.meta,
      gameName: game.name,
      regionName: region.name,
      regionMeta: region.meta,
      gameRomCrc: gameRom.crc,
      gameRomMeta: gameRom.meta,

      // Branch information
      gameRomBranchName: gameRomBranch.name,
      gameRomBranchVersion: gameRomBranch.version,
      platformBranchName: platformBranch.name,
      platformBranchVersion: platformBranch.version,

      // Platform technical details
      addressingModes: platformBranch.addressingModes,
      instructionSet: platformBranch.instructionSet,
      vectors: platformBranch.vectors,

      // Configuration data
      coplib: gameRomBranch.coplib,
      config: gameRomBranch.config,

      // Import metadata
      importedAt: new Date().toISOString(),
      importSource: 'external-gamerom-branch'
    },

    // Audit fields will be set by the database/import process
  }

  // Extract and convert nested data structures from GameRomBranch
  console.log('Starting data extraction from GameRomBranch...')
  console.log('GameRomBranch structure:', {
    hasBlocks: !!gameRomBranch.blocks,
    blocksType: typeof gameRomBranch.blocks,
    blocksKeys: gameRomBranch.blocks ? Object.keys(gameRomBranch.blocks).length : 0,
    allKeys: Object.keys(gameRomBranch),
    hasFiles: !!gameRomBranch.files,
    hasCoplib: !!gameRomBranch.coplib,
    hasFixups: !!gameRomBranch.fixups,
    hasStrings: !!gameRomBranch.strings,
    hasStructs: !!gameRomBranch.structs
  })

  // Debug: Log the actual blocks data if it exists
  if (gameRomBranch.blocks) {
    console.log('Blocks data sample:', JSON.stringify(gameRomBranch.blocks, null, 2).substring(0, 500))
  } else {
    console.log('No blocks field found in GameRomBranch data')
  }

  const cops = extractCops(gameRomBranch.coplib)
  const files = extractFiles(gameRomBranch.files)
  const { blocks, blockTransforms, blockParts } = extractBlocks(gameRomBranch.blocks)
  const labels = extractLabels(gameRomBranch.fixups) // Use fixups for labels
  const mnemonics = extractMnemonics(gameRomBranch.fixups) // Use fixups for mnemonics
  const overrides = extractOverrides(gameRomBranch.fixups) // Use fixups for overrides
  const rewrites = extractRewrites(gameRomBranch.fixups) // Use fixups for rewrites
  const { stringTypes, stringCommands } = extractStringTypes(gameRomBranch.strings)
  const structs = extractStructs(gameRomBranch.structs) // Use types for structs

  console.log('Data extraction summary:', {
    cops: cops.length,
    files: files.length,
    blocks: blocks.length,
    blockTransforms: blockTransforms.length,
    blockParts: blockParts.length,
    labels: labels.length,
    mnemonics: mnemonics.length,
    overrides: overrides.length,
    rewrites: rewrites.length,
    stringTypes: stringTypes.length,
    stringCommands: stringCommands.length,
    structs: structs.length
  })

  return {
    project,
    cops,
    files,
    blocks,
    blockTransforms,
    blockParts,
    labels,
    mnemonics,
    overrides,
    rewrites,
    stringTypes,
    stringCommands,
    structs
  }
}

/**
 * Extract COP definitions from coplib JSON structure
 * Coplib structure: { "mnemonic": { code, parts[], halt? } }
 */
function extractCops(coplib: any): Omit<Cop, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  if (!coplib || typeof coplib !== 'object') return []

  const cops: Omit<Cop, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = []

  // Process each COP entry in the coplib object
  Object.entries(coplib).forEach(([mnemonic, copData]: [string, any]) => {
    if (!copData || typeof copData !== 'object') return

    cops.push({
      code: copData.code || 0,
      mnemonic,
      parts: copData.parts || [],
      halt: copData.halt || false,
      createdBy: '', // Will be set by caller
      updatedBy: null, // Will be set by caller
      deletedBy: null
    })
  })

  return cops
}

/**
 * Extract file definitions from files JSON structure
 * Files structure: { "filename": { size, type, location, compressed?, group?, scene?, upper? } }
 */
function extractFiles(files: any): Omit<File, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  if (!files || typeof files !== 'object') return []

  const fileRecords: Omit<File, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = []

  // Process each file entry in the files object
  Object.entries(files).forEach(([fileName, fileData]: [string, any]) => {
    if (!fileData || typeof fileData !== 'object') return

    fileRecords.push({
      name: fileName,
      location: fileData.location || 0,
      size: fileData.size || 0,
      type: fileData.type || 'Unknown',
      group: fileData.group || null,
      scene: fileData.scene || null,
      compressed: fileData.compressed || false,
      upper: fileData.upper || false,
      meta: fileData.meta || null,
      createdBy: '',
      updatedBy: null,
      deletedBy: null
    })
  })

  return fileRecords
}

/**
 * Extract block definitions from blocks JSON structure
 * Blocks come in as key/value pairs - just flatten them and assign IDs
 */
function extractBlocks(blocks: any): {
  blocks: any[]
  blockTransforms: any[]
  blockParts: any[]
} {
  console.log('extractBlocks called with:', {
    blocksExists: !!blocks,
    blocksType: typeof blocks,
    blocksIsArray: Array.isArray(blocks),
    blocksKeys: blocks ? Object.keys(blocks) : null
  })

  if (!blocks || typeof blocks !== 'object') {
    console.log('No blocks data found or invalid type, returning empty arrays')
    return { blocks: [], blockTransforms: [], blockParts: [] }
  }

  const blockRecords: any[] = []
  const blockTransforms: any[] = []
  const blockParts: any[] = []

  // Process each block - key is block name, value is block data
  Object.entries(blocks).forEach(([blockName, blockData]: [string, any]) => {
    if (!blockData || typeof blockData !== 'object') return

    // Create the Block record
    const block = {
      name: blockName,
      movable: blockData.movable || false,
      group: blockData.group || null,
      scene: blockData.scene || null,
      postProcess: blockData.postProcess || null,
      meta: blockData.meta || null,
      createdBy: '',
      updatedBy: null,
      deletedBy: null
    };

    blockRecords.push(block);

    // Create BlockTransform records if transforms exist
    if (blockData.transforms && Array.isArray(blockData.transforms)) {
      blockData.transforms.forEach((transform: any) => {
        if (!transform || typeof transform !== 'object') return

        blockTransforms.push({
          block, // Use block name as key for later mapping
          regex: transform.regex || '',
          replacement: transform.replacement || '',
          createdBy: '',
          updatedBy: null,
          deletedBy: null
        })
      })
    }

    // Create BlockPart records if parts exist
    // Handle both array format and object format for parts
    if (blockData.parts) {
      if (typeof blockData.parts === 'object') {
        Object.entries(blockData.parts).forEach(([partName, partData]: [string, any]) => {
          if (!partData || typeof partData !== 'object') return

          blockParts.push({
            block,
            name: partName,
            location: partData.location || 0,
            size: partData.size || 0,
            type: partData.type || '',
            index: partData.order || 0,
            createdBy: '',
            updatedBy: null,
            deletedBy: null
          })
        })
      }
    }
  })

  return { blocks: blockRecords, blockTransforms, blockParts }
}

/**
 * Extract label definitions from fixups.labels JSON structure
 * Labels structure: [{ label, location }]
 */
function extractLabels(fixups: any): Omit<Label, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  if (!fixups || typeof fixups !== 'object' || !Array.isArray(fixups.labels)) return []

  const labelRecords: Omit<Label, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = []

  // Process each label entry in the labels array
  fixups.labels.forEach((labelData: any) => {
    if (!labelData || typeof labelData !== 'object') return

    labelRecords.push({
      location: labelData.location || 0,
      label: labelData.label || '',
      createdBy: '', // Will be set by caller
      updatedBy: null,
      deletedBy: null
    })
  })

  return labelRecords
}

/**
 * Extract mnemonic definitions from fixups.mnemonics JSON structure
 * Mnemonics structure: { "mnemonic": address }
 */
function extractMnemonics(fixups: any): Omit<GameMnemonic, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  if (!fixups || typeof fixups !== 'object' || !fixups.mnemonics || typeof fixups.mnemonics !== 'object') return []

  const mnemonicRecords: Omit<GameMnemonic, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = []

  // Process each mnemonic entry in the mnemonics object
  Object.entries(fixups.mnemonics).forEach(([mnemonic, address]: [string, any]) => {
    if (typeof address !== 'number') return

    mnemonicRecords.push({
      address,
      mnemonic,
      meta: null,
      createdBy: '', // Will be set by caller
      updatedBy: null,
      deletedBy: null
    })
  })

  return mnemonicRecords
}

/**
 * Extract override definitions from fixups.overrides JSON structure
 * Overrides structure: [{ value, location, register }]
 */
function extractOverrides(fixups: any): Omit<Override, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  if (!fixups || typeof fixups !== 'object' || !Array.isArray(fixups.overrides)) return []

  const overrideRecords: Omit<Override, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = []

  // Process each override entry in the overrides array
  fixups.overrides.forEach((overrideData: any) => {
    if (!overrideData || typeof overrideData !== 'object') return

    overrideRecords.push({
      location: overrideData.location || 0,
      register: overrideData.register || 'A',
      value: overrideData.value || 0,
      createdBy: '', // Will be set by caller
      updatedBy: null,
      deletedBy: null
    })
  })

  return overrideRecords
}

/**
 * Extract rewrite definitions from fixups.rewrites JSON structure
 * Rewrites structure: [{ value, location }]
 */
function extractRewrites(fixups: any): Omit<Rewrite, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  if (!fixups || typeof fixups !== 'object' || !Array.isArray(fixups.rewrites)) return []

  const rewriteRecords: Omit<Rewrite, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = []

  // Process each rewrite entry in the rewrites array
  fixups.rewrites.forEach((rewriteData: any) => {
    if (!rewriteData || typeof rewriteData !== 'object') return

    rewriteRecords.push({
      location: rewriteData.location || 0,
      value: rewriteData.value || 0,
      createdBy: '', // Will be set by caller
      updatedBy: null,
      deletedBy: null
    })
  })

  return rewriteRecords
}

/**
 * Extract string type definitions from types JSON structure
 * Strings come in as key/value pairs - just flatten them and assign IDs
 */
function extractStringTypes(types: any): {
  stringTypes: any[]
  stringCommands: any[]
} {
  if (!types || !types.strings || typeof types.strings !== 'object') {
    return { stringTypes: [], stringCommands: [] }
  }

  const stringTypes: any[] = []
  const stringCommands: any[] = []

  // Process each string type - key is type name, value is type data
  Object.entries(types.strings).forEach(([typeName, stringData]: [string, any]) => {
    if (!stringData || typeof stringData !== 'object') return

    // Create the StringType record
    stringTypes.push({
      name: typeName,
      delimiter: stringData.delimiter || null,
      shiftType: stringData.shiftType || null,
      terminator: stringData.terminator || null,
      greedy: stringData.greedyTerminator || false,
      characterMap: stringData.characterMap || [],
      meta: { layers: stringData.layers || [] },
      createdBy: '',
      updatedBy: null,
      deletedBy: null
    })

    // Create StringCommand records for each command
    if (stringData.commands && typeof stringData.commands === 'object') {
      Object.entries(stringData.commands).forEach(([commandName, commandData]: [string, any]) => {
        if (!commandData || typeof commandData !== 'object') return

        stringCommands.push({
          stringTypeName: typeName, // Use string type name as key for later mapping
          mnemonic: commandName,
          code: commandData.code || 0,
          halt: commandData.halt || false,
          types: commandData.types || [],
          parts: commandData.parts || [],
          delimiter: commandData.delimiter || null,
          meta: commandData.meta || null,
          createdBy: '',
          updatedBy: null,
          deletedBy: null
        })
      })
    }
  })

  return { stringTypes, stringCommands }
}

/**
 * Extract struct definitions from structs JSON structure
 */
function extractStructs(types: any): Omit<Struct, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  if (!types || typeof types !== 'object' || !types.structs || typeof types.structs !== 'object') return []

  const structRecords: Omit<Struct, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = []

  // Process each struct in the structs object
  Object.entries(types.structs).forEach(([structName, structData]: [string, any]) => {
    if (!structData || typeof structData !== 'object') return

    structRecords.push({
      name: structName,
      types: structData.types ?? [],
      delimiter: structData.delimiter ?? null,
      discriminator: structData.discriminator ?? null,
      parent: structData.parent ?? null,
      parts: structData.parts ?? [],
      meta: null,
      createdBy: '', // Will be set by caller
      updatedBy: null,
      deletedBy: null
    })
  })

  return structRecords
}
