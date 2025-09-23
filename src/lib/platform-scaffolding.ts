import { db } from './supabase'

// Sample data for different platform types
const PLATFORM_TEMPLATES = {
  'SNES': {
    addressingModes: [
      { name: 'Immediate', code: 'imm', size: 1, format: '#$nn', pattern: '#$%02X' },
      { name: 'Absolute', code: 'abs', size: 2, format: '$nnnn', pattern: '$%04X' },
      { name: 'AbsoluteLong', code: 'long', size: 3, format: '$nnnnnn', pattern: '$%06X' },
      { name: 'Direct Page', code: 'dp', size: 1, format: '$nn', pattern: '$%02X' },
      { name: 'DirectPageIndirect', code: 'dp_ind', size: 1, format: '($nn)', pattern: '($%02X)' },
      { name: 'DirectPageIndirectLong', code: 'dp_ind_long', size: 1, format: '[$nn]', pattern: '[$%02X]' },
      { name: 'DirectPageIndexedX', code: 'dp_x', size: 1, format: '$nn,X', pattern: '$%02X,X' },
      { name: 'DirectPageIndexedY', code: 'dp_y', size: 1, format: '$nn,Y', pattern: '$%02X,Y' },
      { name: 'DirectPageIndirectIndexedY', code: 'dp_ind_y', size: 1, format: '($nn),Y', pattern: '($%02X),Y' },
      { name: 'DirectPageIndexedXIndirect', code: 'dp_x_ind', size: 1, format: '($nn,X)', pattern: '($%02X,X)' },
      { name: 'AbsoluteIndexedX', code: 'abs_x', size: 2, format: '$nnnn,X', pattern: '$%04X,X' },
      { name: 'AbsoluteIndexedY', code: 'abs_y', size: 2, format: '$nnnn,Y', pattern: '$%04X,Y' },
      { name: 'AbsoluteLongIndexedX', code: 'long_x', size: 3, format: '$nnnnnn,X', pattern: '$%06X,X' },
      { name: 'StackRelative', code: 'sr', size: 1, format: '$nn,S', pattern: '$%02X,S' },
      { name: 'StackRelativeIndirectIndexedY', code: 'sr_ind_y', size: 1, format: '($nn,S),Y', pattern: '($%02X,S),Y' },
    ],
    instructionGroups: [
      { name: 'ADC', meta: { description: 'Add with Carry' } },
      { name: 'AND', meta: { description: 'Logical AND' } },
      { name: 'ASL', meta: { description: 'Arithmetic Shift Left' } },
      { name: 'BCC', meta: { description: 'Branch if Carry Clear' } },
      { name: 'BCS', meta: { description: 'Branch if Carry Set' } },
      { name: 'BEQ', meta: { description: 'Branch if Equal' } },
      { name: 'BIT', meta: { description: 'Bit Test' } },
      { name: 'BMI', meta: { description: 'Branch if Minus' } },
      { name: 'BNE', meta: { description: 'Branch if Not Equal' } },
      { name: 'BPL', meta: { description: 'Branch if Plus' } },
      { name: 'BRA', meta: { description: 'Branch Always' } },
      { name: 'BRK', meta: { description: 'Break' } },
      { name: 'BRL', meta: { description: 'Branch Long' } },
      { name: 'BVC', meta: { description: 'Branch if Overflow Clear' } },
      { name: 'BVS', meta: { description: 'Branch if Overflow Set' } },
      { name: 'CLC', meta: { description: 'Clear Carry Flag' } },
      { name: 'CLD', meta: { description: 'Clear Decimal Flag' } },
      { name: 'CLI', meta: { description: 'Clear Interrupt Flag' } },
      { name: 'CLV', meta: { description: 'Clear Overflow Flag' } },
      { name: 'CMP', meta: { description: 'Compare Accumulator' } },
      { name: 'CPX', meta: { description: 'Compare X Register' } },
      { name: 'CPY', meta: { description: 'Compare Y Register' } },
      { name: 'DEC', meta: { description: 'Decrement' } },
      { name: 'DEX', meta: { description: 'Decrement X Register' } },
      { name: 'DEY', meta: { description: 'Decrement Y Register' } },
      { name: 'EOR', meta: { description: 'Exclusive OR' } },
      { name: 'INC', meta: { description: 'Increment' } },
      { name: 'INX', meta: { description: 'Increment X Register' } },
      { name: 'INY', meta: { description: 'Increment Y Register' } },
      { name: 'JMP', meta: { description: 'Jump' } },
      { name: 'JSL', meta: { description: 'Jump to Subroutine Long' } },
      { name: 'JSR', meta: { description: 'Jump to Subroutine' } },
      { name: 'LDA', meta: { description: 'Load Accumulator' } },
      { name: 'LDX', meta: { description: 'Load X Register' } },
      { name: 'LDY', meta: { description: 'Load Y Register' } },
      { name: 'LSR', meta: { description: 'Logical Shift Right' } },
      { name: 'MVN', meta: { description: 'Block Move Negative' } },
      { name: 'MVP', meta: { description: 'Block Move Positive' } },
      { name: 'NOP', meta: { description: 'No Operation' } },
      { name: 'ORA', meta: { description: 'Logical OR' } },
      { name: 'PEA', meta: { description: 'Push Effective Address' } },
      { name: 'PEI', meta: { description: 'Push Effective Indirect Address' } },
      { name: 'PER', meta: { description: 'Push Effective Relative Address' } },
      { name: 'PHA', meta: { description: 'Push Accumulator' } },
      { name: 'PHB', meta: { description: 'Push Data Bank Register' } },
      { name: 'PHD', meta: { description: 'Push Direct Page Register' } },
      { name: 'PHK', meta: { description: 'Push Program Bank Register' } },
      { name: 'PHP', meta: { description: 'Push Processor Status' } },
      { name: 'PHX', meta: { description: 'Push X Register' } },
      { name: 'PHY', meta: { description: 'Push Y Register' } },
      { name: 'PLA', meta: { description: 'Pull Accumulator' } },
      { name: 'PLB', meta: { description: 'Pull Data Bank Register' } },
      { name: 'PLD', meta: { description: 'Pull Direct Page Register' } },
      { name: 'PLP', meta: { description: 'Pull Processor Status' } },
      { name: 'PLX', meta: { description: 'Pull X Register' } },
      { name: 'PLY', meta: { description: 'Pull Y Register' } },
      { name: 'REP', meta: { description: 'Reset Processor Status Bits' } },
      { name: 'ROL', meta: { description: 'Rotate Left' } },
      { name: 'ROR', meta: { description: 'Rotate Right' } },
      { name: 'RTI', meta: { description: 'Return from Interrupt' } },
      { name: 'RTL', meta: { description: 'Return from Subroutine Long' } },
      { name: 'RTS', meta: { description: 'Return from Subroutine' } },
      { name: 'SBC', meta: { description: 'Subtract with Carry' } },
      { name: 'SEC', meta: { description: 'Set Carry Flag' } },
      { name: 'SED', meta: { description: 'Set Decimal Flag' } },
      { name: 'SEI', meta: { description: 'Set Interrupt Flag' } },
      { name: 'SEP', meta: { description: 'Set Processor Status Bits' } },
      { name: 'STA', meta: { description: 'Store Accumulator' } },
      { name: 'STP', meta: { description: 'Stop Processor' } },
      { name: 'STX', meta: { description: 'Store X Register' } },
      { name: 'STY', meta: { description: 'Store Y Register' } },
      { name: 'STZ', meta: { description: 'Store Zero' } },
      { name: 'TAX', meta: { description: 'Transfer Accumulator to X' } },
      { name: 'TAY', meta: { description: 'Transfer Accumulator to Y' } },
      { name: 'TCD', meta: { description: 'Transfer Accumulator to Direct Page Register' } },
      { name: 'TCS', meta: { description: 'Transfer Accumulator to Stack Pointer' } },
      { name: 'TDC', meta: { description: 'Transfer Direct Page Register to Accumulator' } },
      { name: 'TRB', meta: { description: 'Test and Reset Bits' } },
      { name: 'TSB', meta: { description: 'Test and Set Bits' } },
      { name: 'TSC', meta: { description: 'Transfer Stack Pointer to Accumulator' } },
      { name: 'TSX', meta: { description: 'Transfer Stack Pointer to X' } },
      { name: 'TXA', meta: { description: 'Transfer X to Accumulator' } },
      { name: 'TXS', meta: { description: 'Transfer X to Stack Pointer' } },
      { name: 'TXY', meta: { description: 'Transfer X to Y' } },
      { name: 'TYA', meta: { description: 'Transfer Y to Accumulator' } },
      { name: 'TYX', meta: { description: 'Transfer Y to X' } },
      { name: 'WAI', meta: { description: 'Wait for Interrupt' } },
      { name: 'WDM', meta: { description: 'Reserved for Future Use' } },
      { name: 'XBA', meta: { description: 'Exchange B and A' } },
      { name: 'XCE', meta: { description: 'Exchange Carry and Emulation Bits' } },
    ],
    vectors: [
      { name: 'COP', address: 0xFFE4, isEntry: false },
      { name: 'BRK', address: 0xFFE6, isEntry: false },
      { name: 'ABORT', address: 0xFFE8, isEntry: false },
      { name: 'NMI', address: 0xFFEA, isEntry: false },
      { name: 'RESET', address: 0xFFFC, isEntry: true },
      { name: 'IRQ', address: 0xFFEE, isEntry: false },
      { name: 'COP_EMU', address: 0xFFF4, isEntry: false },
      { name: 'BRK_EMU', address: 0xFFF6, isEntry: false },
      { name: 'ABORT_EMU', address: 0xFFF8, isEntry: false },
      { name: 'NMI_EMU', address: 0xFFFA, isEntry: false },
      { name: 'RESET_EMU', address: 0xFFFC, isEntry: true },
      { name: 'IRQ_EMU', address: 0xFFFE, isEntry: false },
    ]
  },
  'NES': {
    addressingModes: [
      { name: 'Immediate', code: 'imm', size: 1, format: '#$nn', pattern: '#$%02X' },
      { name: 'ZeroPage', code: 'zp', size: 1, format: '$nn', pattern: '$%02X' },
      { name: 'ZeroPageX', code: 'zp_x', size: 1, format: '$nn,X', pattern: '$%02X,X' },
      { name: 'ZeroPageY', code: 'zp_y', size: 1, format: '$nn,Y', pattern: '$%02X,Y' },
      { name: 'Absolute', code: 'abs', size: 2, format: '$nnnn', pattern: '$%04X' },
      { name: 'AbsoluteX', code: 'abs_x', size: 2, format: '$nnnn,X', pattern: '$%04X,X' },
      { name: 'AbsoluteY', code: 'abs_y', size: 2, format: '$nnnn,Y', pattern: '$%04X,Y' },
      { name: 'Indirect', code: 'ind', size: 2, format: '($nnnn)', pattern: '($%04X)' },
      { name: 'IndexedIndirect', code: 'x_ind', size: 1, format: '($nn,X)', pattern: '($%02X,X)' },
      { name: 'IndirectIndexed', code: 'ind_y', size: 1, format: '($nn),Y', pattern: '($%02X),Y' },
      { name: 'Relative', code: 'rel', size: 1, format: '$nn', pattern: '$%02X' },
    ],
    instructionGroups: [
      { name: 'ADC', meta: { description: 'Add with Carry' } },
      { name: 'AND', meta: { description: 'Logical AND' } },
      { name: 'ASL', meta: { description: 'Arithmetic Shift Left' } },
      { name: 'BCC', meta: { description: 'Branch if Carry Clear' } },
      { name: 'BCS', meta: { description: 'Branch if Carry Set' } },
      { name: 'BEQ', meta: { description: 'Branch if Equal' } },
      { name: 'BIT', meta: { description: 'Bit Test' } },
      { name: 'BMI', meta: { description: 'Branch if Minus' } },
      { name: 'BNE', meta: { description: 'Branch if Not Equal' } },
      { name: 'BPL', meta: { description: 'Branch if Plus' } },
      { name: 'BRK', meta: { description: 'Break' } },
      { name: 'BVC', meta: { description: 'Branch if Overflow Clear' } },
      { name: 'BVS', meta: { description: 'Branch if Overflow Set' } },
      { name: 'CLC', meta: { description: 'Clear Carry Flag' } },
      { name: 'CLD', meta: { description: 'Clear Decimal Flag' } },
      { name: 'CLI', meta: { description: 'Clear Interrupt Flag' } },
      { name: 'CLV', meta: { description: 'Clear Overflow Flag' } },
      { name: 'CMP', meta: { description: 'Compare Accumulator' } },
      { name: 'CPX', meta: { description: 'Compare X Register' } },
      { name: 'CPY', meta: { description: 'Compare Y Register' } },
      { name: 'DEC', meta: { description: 'Decrement' } },
      { name: 'DEX', meta: { description: 'Decrement X Register' } },
      { name: 'DEY', meta: { description: 'Decrement Y Register' } },
      { name: 'EOR', meta: { description: 'Exclusive OR' } },
      { name: 'INC', meta: { description: 'Increment' } },
      { name: 'INX', meta: { description: 'Increment X Register' } },
      { name: 'INY', meta: { description: 'Increment Y Register' } },
      { name: 'JMP', meta: { description: 'Jump' } },
      { name: 'JSR', meta: { description: 'Jump to Subroutine' } },
      { name: 'LDA', meta: { description: 'Load Accumulator' } },
      { name: 'LDX', meta: { description: 'Load X Register' } },
      { name: 'LDY', meta: { description: 'Load Y Register' } },
      { name: 'LSR', meta: { description: 'Logical Shift Right' } },
      { name: 'NOP', meta: { description: 'No Operation' } },
      { name: 'ORA', meta: { description: 'Logical OR' } },
      { name: 'PHA', meta: { description: 'Push Accumulator' } },
      { name: 'PHP', meta: { description: 'Push Processor Status' } },
      { name: 'PLA', meta: { description: 'Pull Accumulator' } },
      { name: 'PLP', meta: { description: 'Pull Processor Status' } },
      { name: 'ROL', meta: { description: 'Rotate Left' } },
      { name: 'ROR', meta: { description: 'Rotate Right' } },
      { name: 'RTI', meta: { description: 'Return from Interrupt' } },
      { name: 'RTS', meta: { description: 'Return from Subroutine' } },
      { name: 'SBC', meta: { description: 'Subtract with Carry' } },
      { name: 'SEC', meta: { description: 'Set Carry Flag' } },
      { name: 'SED', meta: { description: 'Set Decimal Flag' } },
      { name: 'SEI', meta: { description: 'Set Interrupt Flag' } },
      { name: 'STA', meta: { description: 'Store Accumulator' } },
      { name: 'STX', meta: { description: 'Store X Register' } },
      { name: 'STY', meta: { description: 'Store Y Register' } },
      { name: 'TAX', meta: { description: 'Transfer Accumulator to X' } },
      { name: 'TAY', meta: { description: 'Transfer Accumulator to Y' } },
      { name: 'TSX', meta: { description: 'Transfer Stack Pointer to X' } },
      { name: 'TXA', meta: { description: 'Transfer X to Accumulator' } },
      { name: 'TXS', meta: { description: 'Transfer X to Stack Pointer' } },
      { name: 'TYA', meta: { description: 'Transfer Y to Accumulator' } },
    ],
    vectors: [
      { name: 'NMI', address: 0xFFFA, isEntry: false },
      { name: 'RESET', address: 0xFFFC, isEntry: true },
      { name: 'IRQ', address: 0xFFFE, isEntry: false },
    ]
  }
}

export interface ScaffoldingResult {
  success: boolean
  message: string
  counts: {
    addressingModes: number
    instructionGroups: number
    vectors: number
  }
  errors?: string[]
}

export async function scaffoldPlatformData(
  platformId: string, 
  platformName: string, 
  userId: string,
  force: boolean = false
): Promise<ScaffoldingResult> {
  try {
    // Check if platform already has data (unless force is true)
    if (!force) {
      const [modesResult, groupsResult, vectorsResult] = await Promise.all([
        db.addressingModes.getByPlatform(platformId),
        db.instructionGroups.getByPlatform(platformId),
        db.vectors.getByPlatform(platformId)
      ])

      const hasExistingData = 
        (modesResult.data && modesResult.data.length > 0) ||
        (groupsResult.data && groupsResult.data.length > 0) ||
        (vectorsResult.data && vectorsResult.data.length > 0)

      if (hasExistingData) {
        return {
          success: false,
          message: 'Platform already has data. Use force=true to overwrite.',
          counts: {
            addressingModes: modesResult.data?.length || 0,
            instructionGroups: groupsResult.data?.length || 0,
            vectors: vectorsResult.data?.length || 0
          }
        }
      }
    }

    // Determine template based on platform name
    let template = PLATFORM_TEMPLATES['SNES'] // Default to SNES
    if (platformName.toUpperCase().includes('NES') && !platformName.toUpperCase().includes('SNES')) {
      template = PLATFORM_TEMPLATES['NES']
    } else if (platformName.toUpperCase().includes('SNES')) {
      template = PLATFORM_TEMPLATES['SNES']
    }

    const errors: string[] = []
    let addressingModesCount = 0
    let instructionGroupsCount = 0
    let vectorsCount = 0

    // Create addressing modes
    try {
      const addressingModesToCreate = template.addressingModes.map(mode => ({
        ...mode,
        platformId
      }))

      const { data: createdModes, error } = await db.addressingModes.createBatch(addressingModesToCreate, userId)
      
      if (error) {
        errors.push(`Failed to create addressing modes: ${error.message}`)
      } else {
        addressingModesCount = createdModes?.length || 0
      }
    } catch (err) {
      errors.push(`Error creating addressing modes: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Create instruction groups
    try {
      const instructionGroupsToCreate = template.instructionGroups.map(group => ({
        ...group,
        platformId
      }))

      const { data: createdGroups, error } = await db.instructionGroups.createBatch(instructionGroupsToCreate, userId)
      
      if (error) {
        errors.push(`Failed to create instruction groups: ${error.message}`)
      } else {
        instructionGroupsCount = createdGroups?.length || 0
      }
    } catch (err) {
      errors.push(`Error creating instruction groups: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Create vectors
    try {
      const vectorsToCreate = template.vectors.map(vector => ({
        ...vector,
        platformId
      }))

      const { data: createdVectors, error } = await db.vectors.createBatch(vectorsToCreate, userId)
      
      if (error) {
        errors.push(`Failed to create vectors: ${error.message}`)
      } else {
        vectorsCount = createdVectors?.length || 0
      }
    } catch (err) {
      errors.push(`Error creating vectors: ${err instanceof Error ? err.message : String(err)}`)
    }

    const success = errors.length === 0
    const totalItems = addressingModesCount + instructionGroupsCount + vectorsCount

    return {
      success,
      message: success 
        ? `Successfully scaffolded ${totalItems} items for ${platformName} platform`
        : `Scaffolding completed with ${errors.length} errors`,
      counts: {
        addressingModes: addressingModesCount,
        instructionGroups: instructionGroupsCount,
        vectors: vectorsCount
      },
      errors: errors.length > 0 ? errors : undefined
    }

  } catch (error) {
    console.error('Platform scaffolding error:', error)
    return {
      success: false,
      message: 'Failed to scaffold platform data',
      counts: {
        addressingModes: 0,
        instructionGroups: 0,
        vectors: 0
      },
      errors: [error instanceof Error ? error.message : String(error)]
    }
  }
}
