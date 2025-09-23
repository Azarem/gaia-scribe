/**
 * Build Orchestrator - Main Service for Project Build Process
 * 
 * This service coordinates the complete build workflow:
 * 1. Construct DbRoot from project data
 * 2. Create BlockReader and analyze ROM
 * 3. Generate ASM text using BlockWriter
 * 4. Store artifacts in BlockArtifact table
 * 5. Provide progress feedback
 */

import { BlockReader, BlockWriter } from '@gaialabs/core'
import { BinType, CompressionRegistry } from '@gaialabs/shared'
import type { DbRoot } from '@gaialabs/shared'
import { db } from './supabase'
import { useAuthStore } from '../stores/auth-store'
import type { ScribeProject, Block, BlockPart, Cop, File as PrismaFile, Label, GameMnemonic, Override, Rewrite, StringType } from '@prisma/client'

/**
 * Progress callback for build operations
 */
export type BuildProgressCallback = (step: string, progress: number, total: number) => void

/**
 * Build result containing generated artifacts
 */
export interface BuildResult {
  success: boolean
  artifacts: Array<{
    blockId: string
    blockName: string
    content: string
  }>
  errors: string[]
}



/**
 * Build orchestrator for managing the complete build process
 */
export class BuildOrchestrator {
  private project: ScribeProject
  private romFile: File
  private romData: Uint8Array
  private progressCallback?: BuildProgressCallback

  constructor(project: ScribeProject, romFile: File, romData: Uint8Array, progressCallback?: BuildProgressCallback) {
    this.project = project
    this.romFile = romFile
    this.romData = romData
    this.progressCallback = progressCallback
  }

  /**
   * Execute the complete build process
   */
  async build(): Promise<BuildResult> {
    const result: BuildResult = {
      success: false,
      artifacts: [],
      errors: []
    }

    try {
      this.reportProgress('Initializing build process...', 0, 6)

      // Step 1: Load ROM data
      this.reportProgress('Loading ROM file...', 1, 6)
      const romData = await this.loadRomData()

      // Step 2: Construct DbRoot
      this.reportProgress('Constructing database root...', 2, 6)
      const dbRoot = await this.constructDbRoot()

      // Step 3: Create BlockReader and analyze
      this.reportProgress('Analyzing ROM blocks...', 3, 6)
      const blockReader = new BlockReader(romData, dbRoot)
      const chunkFiles = blockReader.analyzeAndResolve()

      // Step 4: Generate ASM using BlockWriter
      this.reportProgress('Generating assembly code...', 4, 6)
      const blockWriter = new BlockWriter(blockReader)
      const asmFiles = chunkFiles.filter(chunk => chunk.type === BinType.Assembly)

      // Step 5: Generate ASM text for each assembly block
      this.reportProgress('Processing assembly blocks...', 5, 6)
      for (const block of asmFiles) {
        try {
          if (!block.textData) {
            block.textData = blockWriter.generateAsm(block)
          }
          
          if (block.textData && block.name && block.id) {
            result.artifacts.push({
              blockId: block.id,
              blockName: block.name,
              content: block.textData
            })
          }
        } catch (error) {
          const errorMsg = `Failed to generate ASM for block ${block.name}: ${error instanceof Error ? error.message : String(error)}`
          result.errors.push(errorMsg)
          console.error(errorMsg, error)
        }
      }

      // Step 6: Store artifacts in database
      this.reportProgress('Storing build artifacts...', 6, 6)
      await this.storeArtifacts(result.artifacts)

      result.success = result.errors.length === 0
      this.reportProgress('Build completed!', 6, 6)

    } catch (error) {
      const errorMsg = `Build failed: ${error instanceof Error ? error.message : String(error)}`
      result.errors.push(errorMsg)
      console.error('Build orchestrator error:', error)
    }

    return result
  }

  /**
   * Load ROM data from the provided File object and Uint8Array
   * The data is already loaded and validated by the RomPathModal
   */
  private async loadRomData(): Promise<Uint8Array> {
    try {
      // Validate that we have ROM data
      if (!this.romData || this.romData.length === 0) {
        throw new Error(`ROM file data is empty or not provided`)
      }

      // Basic validation - check for minimum ROM size (typically at least 32KB)
      const minRomSize = 32 * 1024 // 32KB
      if (this.romData.length < minRomSize) {
        console.warn(`ROM file seems small (${this.romData.length} bytes). Expected at least ${minRomSize} bytes.`)
      }

      console.log(`Using ROM file: ${this.romFile.name} (${this.romData.length} bytes)`)
      return this.romData

    } catch (error) {
      // Enhanced error handling
      if (error instanceof Error) {
        throw new Error(`Failed to load ROM file: ${this.romFile.name}. ${error.message}`)
      } else {
        throw new Error(`Unknown error loading ROM file: ${this.romFile.name}`)
      }
    }
  }

  /**
   * Construct DbRoot from project data
   */
  private async constructDbRoot(): Promise<DbRoot> {
    // Load all project data
    const [blocks, cops, files, labels, mnemonics, overrides, rewrites, stringTypes] = await Promise.all([
      this.loadProjectBlocks(),
      this.loadProjectCops(),
      this.loadProjectFiles(),
      this.loadProjectLabels(),
      this.loadProjectMnemonics(),
      this.loadProjectOverrides(),
      this.loadProjectRewrites(),
      this.loadProjectStringTypes()
    ])

    // Convert to DbRoot format
    const dbRoot: DbRoot = {
      copDef: this.convertCopsToDbFormat(cops),
      copLookup: {},
      mnemonics: this.convertMnemonicsToDbFormat(mnemonics),
      structs: {},
      stringTypes: this.convertStringTypesToDbFormat(stringTypes),
      stringDelimiters: [],
      stringCharLookup: {},
      files: this.convertFilesToDbFormat(files),
      config: {
        sfxLocation: 0,
        sfxCount: 0,
        accentMap: [],
        compression: 'none',
        entryPoints: [],
        paths: {} as any
      },
      blocks: this.convertBlocksToDbFormat(blocks),
      overrides: this.convertOverridesToDbFormat(overrides),
      labels: this.convertLabelsToDbFormat(labels),
      rewrites: this.convertRewritesToDbFormat(rewrites),
      entryPoints: [],
      opCodes: {},
      opLookup: {},
      addrLookup: {},
      compression: CompressionRegistry.get('QuintetLZ')
    }

    return dbRoot
  }

  /**
   * Load project blocks with parts
   */
  private async loadProjectBlocks(): Promise<(Block & { parts: BlockPart[] })[]> {
    const { data: blocks, error } = await db.blocks.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load blocks: ${error.message}`)
      
    const { data: parts, error: partsError } = await db.blockParts.getByProject(this.project.id)
    if (partsError) throw new Error(`Failed to load parts: ${partsError.message}`)

    // Combine blocks and parts
    const blocksWithParts = (blocks || []).map(block => ({
      ...block,
      parts: parts?.filter(part => part.blockId === block.id) || []
    }))
        
    return blocksWithParts
  }

  /**
   * Load other project data methods
   */
  private async loadProjectCops(): Promise<Cop[]> {
    const { data, error } = await db.cops.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load COPs: ${error.message}`)
    return data || []
  }

  private async loadProjectFiles(): Promise<PrismaFile[]> {
    const { data, error } = await db.files.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load files: ${error.message}`)
    return data || []
  }

  private async loadProjectLabels(): Promise<Label[]> {
    const { data, error } = await db.labels.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load labels: ${error.message}`)
    return data || []
  }

  private async loadProjectMnemonics(): Promise<GameMnemonic[]> {
    const { data, error } = await db.mnemonics.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load mnemonics: ${error.message}`)
    return data || []
  }

  private async loadProjectOverrides(): Promise<Override[]> {
    const { data, error } = await db.overrides.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load overrides: ${error.message}`)
    return data || []
  }

  private async loadProjectRewrites(): Promise<Rewrite[]> {
    const { data, error } = await db.rewrites.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load rewrites: ${error.message}`)
    return data || []
  }

  private async loadProjectStringTypes(): Promise<StringType[]> {
    const { data, error } = await db.stringTypes.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load string types: ${error.message}`)
    return data || []
  }

  /**
   * Convert project data to DbRoot format methods
   * These will need to be implemented based on the exact DbRoot interface requirements
   */
  private convertCopsToDbFormat(cops: Cop[]): Record<number, any> {
    // Convert Scribe COPs to CopDef format
    const result: Record<number, any> = {}
    cops.forEach(cop => {
      if (cop.code !== null) {
        result[cop.code] = {
          code: cop.code,
          mnemonic: cop.mnemonic,
          parts: cop.parts || [],
          halt: cop.halt || false
        }
      }
    })
    return result
  }

  private convertMnemonicsToDbFormat(mnemonics: GameMnemonic[]): Record<number, string> {
    const result: Record<number, string> = {}
    mnemonics.forEach(mnemonic => {
      if (mnemonic.address !== null) {
        result[mnemonic.address] = mnemonic.mnemonic
      }
    })
    return result
  }

  private convertStringTypesToDbFormat(stringTypes: StringType[]): Record<string, any> {
    // Convert Scribe string types to DbStringType format
    const result: Record<string, any> = {}
    stringTypes.forEach(stringType => {
      result[stringType.name] = {
        name: stringType.name,
        delimiter: stringType.delimiter || '',
        shiftType: stringType.shiftType || 'none',
        terminator: stringType.terminator || 0,
        greedy: stringType.greedy || false,
        characterMap: stringType.characterMap || []
      }
    })
    return result
  }

  private convertFilesToDbFormat(files: PrismaFile[]): any[] {
    // Convert Scribe files to DbFile format
    return files.map(file => ({
      name: file.name,
      location: file.location,
      size: file.size,
      type: file.type,
      group: file.group || null,
      scene: file.scene || null,
      compressed: file.compressed || false,
      upper: file.upper || false,
      meta: file.meta || {}
    }))
  }

  private convertBlocksToDbFormat(blocks: (Block & { parts: BlockPart[] })[]): any[] {
    // Convert Scribe blocks to DbBlock format
    return blocks.map(block => ({
      id: block.id,
      name: block.name,
      movable: block.movable || false,
      group: block.group || null,
      scene: block.scene || null,
      postProcess: block.postProcess || null,
      meta: block.meta || {},
      parts: block.parts.map(part => ({
        name: part.name,
        location: part.location,
        size: part.size,
        type: part.type,
        index: part.index || 0
      }))
    }))
  }

  private convertOverridesToDbFormat(overrides: Override[]): Record<number, any> {
    // Convert Scribe overrides to DbOverride format
    const result: Record<number, any> = {}
    overrides.forEach(override => {
      if (override.location !== null) {
        result[override.location] = {
          location: override.location,
          register: override.register || 'A', // Default register
          value: override.value
        }
      }
    })
    return result
  }

  private convertLabelsToDbFormat(labels: Label[]): Record<number, string> {
    const result: Record<number, string> = {}
    labels.forEach(label => {
      if (label.location !== null) {
        result[label.location] = label.label
      }
    })
    return result
  }

  private convertRewritesToDbFormat(rewrites: Rewrite[]): Record<number, number> {
    const result: Record<number, number> = {}
    rewrites.forEach(rewrite => {
      if (rewrite.location !== null && rewrite.value !== null) {
        result[rewrite.location] = rewrite.value
      }
    })
    return result
  }

  /**
   * Store generated artifacts in the database
   */
  private async storeArtifacts(artifacts: BuildResult['artifacts']): Promise<void> {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error('User not authenticated')

    for (const artifact of artifacts) {
      try {
        // Find the actual block by name to get the ID
        const { data: blocks, error: blockError } = await db.blocks.getByProject(this.project.id)
        if (blockError) throw new Error(`Failed to find block: ${blockError.message}`)

        const block = blocks?.find(b => b.name === artifact.blockName)
        if (!block) {
          console.warn(`Block not found for artifact: ${artifact.blockName}`)
          continue
        }

        // Store or update the artifact
        await db.blockArtifacts.upsert({
          blockId: block.id,
          content: artifact.content,
          meta: null,
          createdBy: user.id,
          updatedBy: user.id
        })
      } catch (error) {
        console.error(`Failed to store artifact for block ${artifact.blockName}:`, error)
        throw error
      }
    }
  }

  /**
   * Report progress to callback if provided
   */
  private reportProgress(step: string, progress: number, total: number): void {
    if (this.progressCallback) {
      this.progressCallback(step, progress, total)
    }
  }
}

/**
 * Create a new build orchestrator instance
 */
export function createBuildOrchestrator(
  project: ScribeProject,
  romFile: File,
  romData: Uint8Array,
  progressCallback?: BuildProgressCallback
): BuildOrchestrator {
  return new BuildOrchestrator(project, romFile, romData, progressCallback)
}
