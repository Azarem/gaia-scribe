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
import { BinType, CompressionRegistry, CopDef, DbBlock, DbFile, DbOverride, DbStringType, DbStruct, MemberType, RomProcessingConstants } from '@gaialabs/shared'
import { type DbRoot, OpCode } from '@gaialabs/shared'
import { db } from '../services/supabase'
import { useAuthStore } from '../stores/auth-store'
import type { ScribeProject, Block, BlockPart, Cop, File as PrismaFile, Label, GameMnemonic, Override, Rewrite, StringType, AddressingMode, InstructionGroup, InstructionCode, Struct, StringCommand } from '@prisma/client'

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
      const internalRoot = await this.constructDbRoot()
      const dbRoot = null;// await DbRootUtils.fromSupabaseGameRom("Illusion of Gaia");// await this.constructDbRoot()
      
      // Step 3: Create BlockReader and analyze
      this.reportProgress('Analyzing ROM blocks...', 3, 6)
      const blockReader = new BlockReader(romData, dbRoot ?? internalRoot)
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
    const [blocks, cops, files, labels, mnemonics, overrides, rewrites, stringTypes, stringCommands, structs, adrModes, instrGroups, instrCodes] = await Promise.all([
      this.loadProjectBlocks(),
      this.loadProjectCops(),
      this.loadProjectFiles(),
      this.loadProjectLabels(),
      this.loadProjectMnemonics(),
      this.loadProjectOverrides(),
      this.loadProjectRewrites(),
      this.loadProjectStringTypes(),
      this.loadProjectStringCommands(),
      this.loadProjectStructs(),
      this.loadPlatformAddressingModes(),
      this.loadPlatformInstructionGroups(),
      this.loadPlatformInstructionCodes()
    ])

    const { addrLookup, codeLookup } = this.convertInstructionSetToDbFormat(adrModes, instrGroups, instrCodes);

    // Convert to DbRoot format
    const dbRoot: DbRoot = {
      copDef: this.convertCopsToDbFormat(cops),
      copLookup: {},
      mnemonics: this.convertMnemonicsToDbFormat(mnemonics),
      structs: this.convertStructsToDbFormat(structs),
      stringTypes: this.convertStringTypesToDbFormat(stringTypes, stringCommands),
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
      opCodes: codeLookup,
      opLookup: {},
      addrLookup,
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
    const blocksWithParts = (blocks || []).map((block : any) => ({
      ...block,
      parts: parts?.filter((part : any) => part.blockId === block.id)?.sort((a : any, b : any) => {
          const orderA = a.index ?? 0;
          const orderB = b.index ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.location - b.location;
      }) ?? []
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

  private async loadProjectStringCommands(): Promise<StringCommand[]> {
    const { data, error } = await db.stringCommands.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load string commands: ${error.message}`)
    return data || []
  }

  private async loadProjectStructs(): Promise<Struct[]> {
    const { data, error } = await db.structs.getByProject(this.project.id)
    if (error) throw new Error(`Failed to load structs: ${error.message}`)
    return data || []
  }

  private async loadPlatformAddressingModes(): Promise<AddressingMode[]> {
    const { data, error } = await db.addressingModes.getByPlatform(this.project.platformId)
    if (error) throw new Error(`Failed to load addressing modes: ${error.message}`)
    return data || []
  }

  private async loadPlatformInstructionGroups(): Promise<InstructionGroup[]> {
    const { data, error } = await db.instructionGroups.getByPlatform(this.project.platformId)
    if (error) throw new Error(`Failed to load instruction groups: ${error.message}`)
    return data || []
  }

  private async loadPlatformInstructionCodes(): Promise<InstructionCode[]> {
    const { data, error } = await db.instructionCodes.getByPlatform(this.project.platformId)
    if (error) throw new Error(`Failed to load instruction codes: ${error.message}`)
    return data || []
  }

  /**
   * Convert project data to DbRoot format methods
   * These will need to be implemented based on the exact DbRoot interface requirements
   */
  private convertCopsToDbFormat(cops: Cop[]): Record<number, CopDef> {
    // Convert Scribe COPs to CopDef format
    const result: Record<number, any> = {}
    cops.forEach(cop => {
      if (cop.code !== null) {
        result[cop.code] = {
          code: cop.code,
          mnem: cop.mnemonic,
          parts: cop.parts || [],
          halt: cop.halt,
          size: RomProcessingConstants.getSize(cop.parts)
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

  private convertStringTypesToDbFormat(stringTypes: StringType[], stringCommands: StringCommand[]): Record<string, DbStringType> {
    // Convert Scribe string types to DbStringType format
    const result: Record<string, DbStringType> = {}
    const lookup: Record<string, DbStringType> = {};
    stringTypes.forEach(stringType => {
      result[stringType.name] = lookup[stringType.id] = {
        name: stringType.name,
        delimiter: stringType.delimiter || '',
        shiftType: stringType.shiftType || 'none',
        terminator: stringType.terminator || 0,
        greedyTerminator: stringType.greedy || false,
        commands: {},
        characterMap: stringType.characterMap || [],
        layers: []
      }
    })
    stringCommands.forEach(stringCommand => {
      lookup[stringCommand.stringTypeId].commands[stringCommand.code] = {
        key: stringCommand.code,
        value: stringCommand.mnemonic,
        types: stringCommand.types.map(type => type as MemberType) || [],
        delimiter: stringCommand.delimiter || 0,
        halt: stringCommand.halt || false,
        set: stringCommand.stringTypeId
      }
    })
    return result
  }

  private convertFilesToDbFormat(files: PrismaFile[]): DbFile[] {
    // Convert Scribe files to DbFile format
    return files.map(file => ({
      name: file.name,
      start: file.location,
      end: file.location + file.size,
      size: file.size,
      type: file.type as BinType,
      group: file.group || null,
      scene: file.scene || null,
      compressed: file.compressed || false,
      upper: file.upper || false,
      meta: file.meta || {}
    }))
  }

  private convertBlocksToDbFormat(blocks: (Block & { parts: BlockPart[] })[]): DbBlock[] {
    // Convert Scribe blocks to DbBlock format
    return blocks.map(block => ({
      id: block.id,
      name: block.name,
      movable: block.movable || false,
      group: block.group || '',
      scene: block.scene || '',
      postProcess: block.postProcess || '',
      meta: block.meta || {},
      parts: block.parts
        .map((part: BlockPart) => ({
          name: part.name,
          start: part.location,
          end: part.location + part.size,
          size: part.size,
          struct: part.type,
          order: part.index || 0,
          block: block.name
        }))
        .sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.start - b.start;
        })
    })).sort((a, b) => a.parts[0].start - b.parts[0].start)
  }

  private convertOverridesToDbFormat(overrides: Override[]): Record<number, DbOverride> {
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

  private convertStructsToDbFormat(structs: Struct[]): Record<string, DbStruct> {
    const result: Record<string, DbStruct> = {}
    structs.forEach(struct => {
      result[struct.name] = {
        name: struct.name,
        types: struct.types,
        delimiter: struct.delimiter ?? undefined,
        discriminator: struct.discriminator ?? undefined,
        parent: struct.parent ?? undefined,
      }
    })
    return result
  }

  private convertInstructionSetToDbFormat(addressingModes: AddressingMode[], instructionGroups: InstructionGroup[], instructionCodes: InstructionCode[]) {
    const addrLookup: Record<string, any> = {};
    const addrMap: Record<string, string> = {};
    addressingModes.forEach(mode => {
      addrLookup[mode.name] = {
        size: mode.size,
        shorthand: mode.code,
        parseRegex: mode.pattern,
        formatString: mode.format,
      };
      addrMap[mode.id] = mode.name;
    });
    const groupMap: Record<string, string> = {};
    instructionGroups.forEach(group => {
      groupMap[group.id] = group.name;
    });
    const codeLookup: Record<number, OpCode> = {};
    instructionCodes.forEach(code => {
      codeLookup[code.code] = new OpCode (
        code.code,
        groupMap[code.groupId],
        addrMap[code.modeId],
      );
    });
    return { addrLookup, codeLookup };
  }

  /**
   * Store generated artifacts in the database
   */
  private async storeArtifacts(artifacts: BuildResult['artifacts']): Promise<void> {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error('User not authenticated')

    if (artifacts.length === 0) return

    try {
      // Prepare artifacts for bulk upsert
      const artifactsToUpsert = artifacts.map(artifact => ({
        blockId: artifact.blockId,
        content: artifact.content,
        meta: null,
        createdBy: user.id,
        updatedBy: user.id
      }))

      // Perform bulk upsert
      const { error } = await db.blockArtifacts.bulkUpsert(artifactsToUpsert)

      if (error) {
        console.error('Failed to store artifacts:', error)
        throw new Error(`Failed to store artifacts: ${error.message}`)
      }

      console.log(`Successfully stored ${artifacts.length} artifacts`)
    } catch (error) {
      console.error('Failed to store artifacts:', error)
      throw error
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
