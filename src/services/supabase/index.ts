// Import all service modules
import { projects } from './projects'
import { projectUsers } from './project-users'
import { cops } from './cops'
import { files } from './files'
import { blocks } from './blocks'
import { blockTransforms } from './block-transforms'
import { blockParts } from './block-parts'
import { strings } from './strings'
import { blockArtifacts } from './block-artifacts'
import { stringCommands } from './string-commands'
import { structs } from './structs'
import { labels } from './labels'
import { rewrites } from './rewrites'
import { mnemonics } from './mnemonics'
import { overrides } from './overrides'
import { users } from './users'
import { platforms } from './platforms'
import { addressingModes } from './addressing-modes'
import { instructionGroups } from './instruction-groups'
import { instructionCodes } from './instruction-codes'
import { vectors } from './vectors'
import { external } from './external'

// Reconstruct the db object with the same structure as before
export const db = {
  projects,
  projectUsers,
  cops,
  files,
  blocks,
  blockTransforms,
  blockParts,
  strings,
  blockArtifacts,
  stringCommands,
  structs,
  labels,
  rewrites,
  mnemonics,
  overrides,
  users,
  platforms,
  addressingModes,
  instructionGroups,
  instructionCodes,
  vectors,
  external,
  
  // Alias for consistency with other naming patterns
  stringTypes: {
    async getByProject(projectId: string) {
      return strings.getByProject(projectId)
    },

    async getById(id: string) {
      return strings.getById(id)
    },

    async create(stringType: { name: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[]; projectId: string }, userId: string) {
      return strings.create(stringType, userId)
    },

    async update(id: string, updates: { name?: string; delimiter?: string; shiftType?: string; terminator?: number; greedy?: boolean; meta?: any; characterMap?: string[] }, userId: string) {
      return strings.update(id, updates, userId)
    },

    async delete(id: string, userId: string) {
      return strings.delete(id, userId)
    },
  },
}

// Re-export individual services for direct imports if needed
export {
  projects,
  projectUsers,
  cops,
  files,
  blocks,
  blockTransforms,
  blockParts,
  strings,
  blockArtifacts,
  stringCommands,
  structs,
  labels,
  rewrites,
  mnemonics,
  overrides,
  users,
  platforms,
  addressingModes,
  instructionGroups,
  instructionCodes,
  vectors,
  external,
}

