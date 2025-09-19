// Re-export Prisma types for use throughout the application
// These are auto-generated from your schema.prisma file when you run `prisma generate`

export type {
  User,
  ScribeProject,
  Cop,
  Label,
  Rewrite,
  GameMnemonic,
  Override,
  File,
  Block,
  BlockTransform,
  BlockPart,
  StringType,
  StringCommand,
  Struct,
  Prisma,
} from '@prisma/client'

// Re-export shared types from @gaialabs/shared package
// These provide standardized interfaces for project data structures
export type {
  ProjectData,
  ProjectBranchData,
  ProjectFileData,
  ProjectPayload,
  BaseRomData,
  BaseRomBranchData,
  BaseRomFileData,
  BaseRomPayload,
} from '@gaialabs/shared'

// Useful type combinations for common operations
export type {
  Prisma as PrismaTypes,
} from '@prisma/client'

// Example of how to create typed queries:
// const user: User = await prisma.user.findUnique(...)
// const projects: ScribeProject[] = await prisma.scribeProject.findMany(...)
//
// For Supabase realtime subscriptions, you can type the payload:
// supabase.channel('projects')
//   .on('postgres_changes', { 
//     event: 'INSERT', 
//     schema: 'public', 
//     table: 'ScribeProject' 
//   }, (payload: { new: ScribeProject }) => {
//     console.log('New project:', payload.new)
//   })

