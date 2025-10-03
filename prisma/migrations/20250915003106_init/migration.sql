-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "avatarUrl" TEXT,
    "groups" TEXT[] DEFAULT ARRAY['user']::TEXT[],
    "lastActiveProjectId" TEXT,
    "lastActiveObjectId" TEXT,
    "lastActiveObjectType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScribeProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "gameRomBranchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "ScribeProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cop" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "mnemonic" TEXT NOT NULL,
    "parts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "halt" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Cop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "location" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rewrite" (
    "id" TEXT NOT NULL,
    "location" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Rewrite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMnemonic" (
    "id" TEXT NOT NULL,
    "address" INTEGER NOT NULL,
    "mnemonic" TEXT NOT NULL,
    "meta" JSONB,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "GameMnemonic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Override" (
    "id" TEXT NOT NULL,
    "location" INTEGER NOT NULL,
    "register" TEXT NOT NULL DEFAULT 'A',
    "value" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "group" TEXT,
    "scene" TEXT,
    "compressed" BOOLEAN,
    "upper" BOOLEAN,
    "meta" JSONB,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "movable" BOOLEAN NOT NULL DEFAULT false,
    "group" TEXT,
    "scene" TEXT,
    "postProcess" TEXT,
    "meta" JSONB,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockTransform" (
    "id" TEXT NOT NULL,
    "regex" TEXT NOT NULL,
    "replacement" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "BlockTransform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockPart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "index" INTEGER,
    "blockId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "BlockPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StringType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delimiter" TEXT,
    "shiftType" TEXT,
    "terminator" INTEGER,
    "greedy" BOOLEAN,
    "meta" JSONB,
    "characterMap" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "StringType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StringCommand" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "mnemonic" TEXT NOT NULL,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "delimiter" INTEGER,
    "halt" BOOLEAN,
    "parts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meta" JSONB,
    "stringTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "StringCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Struct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "delimiter" INTEGER,
    "discriminator" INTEGER,
    "parent" TEXT,
    "parts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meta" JSONB,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Struct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUser" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'contributor',
    "projectId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "ProjectUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlockArtifact" (
    "blockId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "BlockArtifact_pkey" PRIMARY KEY ("blockId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE INDEX "User_lastActiveProjectId_idx" ON "public"."User"("lastActiveProjectId");

-- CreateIndex
CREATE INDEX "User_createdBy_idx" ON "public"."User"("createdBy");

-- CreateIndex
CREATE INDEX "User_updatedBy_idx" ON "public"."User"("updatedBy");

-- CreateIndex
CREATE INDEX "User_deletedBy_idx" ON "public"."User"("deletedBy");

-- CreateIndex
CREATE INDEX "ScribeProject_name_idx" ON "ScribeProject"("name");

-- CreateIndex
CREATE INDEX "Cop_projectId_idx" ON "Cop"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Cop_projectId_code_key" ON "Cop"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Cop_projectId_mnemonic_key" ON "Cop"("projectId", "mnemonic");

-- CreateIndex
CREATE INDEX "Label_projectId_idx" ON "Label"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Label_projectId_location_key" ON "Label"("projectId", "location");

-- CreateIndex
CREATE INDEX "Rewrite_projectId_idx" ON "Rewrite"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Rewrite_projectId_location_key" ON "Rewrite"("projectId", "location");

-- CreateIndex
CREATE INDEX "GameMnemonic_projectId_idx" ON "GameMnemonic"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "GameMnemonic_projectId_address_key" ON "GameMnemonic"("projectId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "GameMnemonic_projectId_mnemonic_key" ON "GameMnemonic"("projectId", "mnemonic");

-- CreateIndex
CREATE INDEX "Override_projectId_idx" ON "Override"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Override_projectId_location_key" ON "Override"("projectId", "location");

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "File"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "File_projectId_name_key" ON "File"("projectId", "name");

-- CreateIndex
CREATE INDEX "Block_projectId_idx" ON "Block"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_projectId_name_key" ON "Block"("projectId", "name");

-- CreateIndex
CREATE INDEX "BlockTransform_blockId_idx" ON "BlockTransform"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockTransform_blockId_regex_key" ON "BlockTransform"("blockId", "regex");

-- CreateIndex
CREATE INDEX "BlockPart_blockId_idx" ON "BlockPart"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockPart_blockId_name_key" ON "BlockPart"("blockId", "name");

-- CreateIndex
CREATE INDEX "StringType_projectId_idx" ON "StringType"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StringType_projectId_name_key" ON "StringType"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StringType_projectId_delimiter_key" ON "StringType"("projectId", "delimiter");

-- CreateIndex
CREATE INDEX "StringCommand_stringTypeId_idx" ON "StringCommand"("stringTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "StringCommand_stringTypeId_code_key" ON "StringCommand"("stringTypeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StringCommand_stringTypeId_mnemonic_key" ON "StringCommand"("stringTypeId", "mnemonic");

-- CreateIndex
CREATE INDEX "Struct_projectId_idx" ON "Struct"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Struct_projectId_name_key" ON "Struct"("projectId", "name");

-- CreateIndex
CREATE INDEX "ProjectUser_projectId_idx" ON "ProjectUser"("projectId");

-- CreateIndex
CREATE INDEX "ProjectUser_userId_idx" ON "ProjectUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUser_projectId_userId_key" ON "ProjectUser"("projectId", "userId");

-- CreateIndex
CREATE INDEX "ProjectUser_createdBy_idx" ON "public"."ProjectUser"("createdBy");

-- CreateIndex
CREATE INDEX "ProjectUser_updatedBy_idx" ON "public"."ProjectUser"("updatedBy");

-- CreateIndex
CREATE INDEX "ProjectUser_deletedBy_idx" ON "public"."ProjectUser"("deletedBy");

-- CreateIndex
CREATE INDEX "ScribeProject_createdBy_idx" ON "public"."ScribeProject"("createdBy");

-- CreateIndex
CREATE INDEX "ScribeProject_updatedBy_idx" ON "public"."ScribeProject"("updatedBy");

-- CreateIndex
CREATE INDEX "ScribeProject_deletedBy_idx" ON "public"."ScribeProject"("deletedBy");

-- CreateIndex
CREATE INDEX "Block_createdBy_idx" ON "public"."Block"("createdBy");

-- CreateIndex
CREATE INDEX "Block_updatedBy_idx" ON "public"."Block"("updatedBy");

-- CreateIndex
CREATE INDEX "Block_deletedBy_idx" ON "public"."Block"("deletedBy");

-- CreateIndex
CREATE INDEX "BlockPart_createdBy_idx" ON "public"."BlockPart"("createdBy");

-- CreateIndex
CREATE INDEX "BlockPart_updatedBy_idx" ON "public"."BlockPart"("updatedBy");

-- CreateIndex
CREATE INDEX "BlockPart_deletedBy_idx" ON "public"."BlockPart"("deletedBy");

-- CreateIndex
CREATE INDEX "BlockTransform_createdBy_idx" ON "public"."BlockTransform"("createdBy");

-- CreateIndex
CREATE INDEX "BlockTransform_updatedBy_idx" ON "public"."BlockTransform"("updatedBy");

-- CreateIndex
CREATE INDEX "BlockTransform_deletedBy_idx" ON "public"."BlockTransform"("deletedBy");

-- CreateIndex
CREATE INDEX "Cop_createdBy_idx" ON "public"."Cop"("createdBy");

-- CreateIndex
CREATE INDEX "Cop_updatedBy_idx" ON "public"."Cop"("updatedBy");

-- CreateIndex
CREATE INDEX "Cop_deletedBy_idx" ON "public"."Cop"("deletedBy");

-- CreateIndex
CREATE INDEX "File_createdBy_idx" ON "public"."File"("createdBy");

-- CreateIndex
CREATE INDEX "File_updatedBy_idx" ON "public"."File"("updatedBy");

-- CreateIndex
CREATE INDEX "File_deletedBy_idx" ON "public"."File"("deletedBy");

-- CreateIndex
CREATE INDEX "GameMnemonic_createdBy_idx" ON "public"."GameMnemonic"("createdBy");

-- CreateIndex
CREATE INDEX "GameMnemonic_updatedBy_idx" ON "public"."GameMnemonic"("updatedBy");

-- CreateIndex
CREATE INDEX "GameMnemonic_deletedBy_idx" ON "public"."GameMnemonic"("deletedBy");

-- CreateIndex
CREATE INDEX "Label_createdBy_idx" ON "public"."Label"("createdBy");

-- CreateIndex
CREATE INDEX "Label_updatedBy_idx" ON "public"."Label"("updatedBy");

-- CreateIndex
CREATE INDEX "Label_deletedBy_idx" ON "public"."Label"("deletedBy");

-- CreateIndex
CREATE INDEX "Override_createdBy_idx" ON "public"."Override"("createdBy");

-- CreateIndex
CREATE INDEX "Override_updatedBy_idx" ON "public"."Override"("updatedBy");

-- CreateIndex
CREATE INDEX "Override_deletedBy_idx" ON "public"."Override"("deletedBy");

-- CreateIndex
CREATE INDEX "Rewrite_createdBy_idx" ON "public"."Rewrite"("createdBy");

-- CreateIndex
CREATE INDEX "Rewrite_updatedBy_idx" ON "public"."Rewrite"("updatedBy");

-- CreateIndex
CREATE INDEX "Rewrite_deletedBy_idx" ON "public"."Rewrite"("deletedBy");

-- CreateIndex
CREATE INDEX "StringCommand_createdBy_idx" ON "public"."StringCommand"("createdBy");

-- CreateIndex
CREATE INDEX "StringCommand_updatedBy_idx" ON "public"."StringCommand"("updatedBy");

-- CreateIndex
CREATE INDEX "StringCommand_deletedBy_idx" ON "public"."StringCommand"("deletedBy");

-- CreateIndex
CREATE INDEX "StringType_createdBy_idx" ON "public"."StringType"("createdBy");

-- CreateIndex
CREATE INDEX "StringType_updatedBy_idx" ON "public"."StringType"("updatedBy");

-- CreateIndex
CREATE INDEX "StringType_deletedBy_idx" ON "public"."StringType"("deletedBy");

-- CreateIndex
CREATE INDEX "Struct_createdBy_idx" ON "public"."Struct"("createdBy");

-- CreateIndex
CREATE INDEX "Struct_updatedBy_idx" ON "public"."Struct"("updatedBy");

-- CreateIndex
CREATE INDEX "Struct_deletedBy_idx" ON "public"."Struct"("deletedBy");


-- CreateIndex
CREATE INDEX "BlockArtifact_createdBy_idx" ON "public"."BlockArtifact"("createdBy");

-- CreateIndex
CREATE INDEX "BlockArtifact_updatedBy_idx" ON "public"."BlockArtifact"("updatedBy");

-- CreateIndex
CREATE INDEX "BlockArtifact_deletedBy_idx" ON "public"."BlockArtifact"("deletedBy");

-- AddForeignKey
ALTER TABLE "public"."BlockArtifact" ADD CONSTRAINT "BlockArtifact_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "public"."Block"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockArtifact" ADD CONSTRAINT "BlockArtifact_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockArtifact" ADD CONSTRAINT "BlockArtifact_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockArtifact" ADD CONSTRAINT "BlockArtifact_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastActiveProjectId_fkey" FOREIGN KEY ("lastActiveProjectId") REFERENCES "ScribeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScribeProject" ADD CONSTRAINT "ScribeProject_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScribeProject" ADD CONSTRAINT "ScribeProject_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScribeProject" ADD CONSTRAINT "ScribeProject_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cop" ADD CONSTRAINT "Cop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cop" ADD CONSTRAINT "Cop_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cop" ADD CONSTRAINT "Cop_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cop" ADD CONSTRAINT "Cop_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rewrite" ADD CONSTRAINT "Rewrite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rewrite" ADD CONSTRAINT "Rewrite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rewrite" ADD CONSTRAINT "Rewrite_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rewrite" ADD CONSTRAINT "Rewrite_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMnemonic" ADD CONSTRAINT "GameMnemonic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMnemonic" ADD CONSTRAINT "GameMnemonic_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMnemonic" ADD CONSTRAINT "GameMnemonic_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMnemonic" ADD CONSTRAINT "GameMnemonic_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Override" ADD CONSTRAINT "Override_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Override" ADD CONSTRAINT "Override_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Override" ADD CONSTRAINT "Override_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Override" ADD CONSTRAINT "Override_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockTransform" ADD CONSTRAINT "BlockTransform_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockTransform" ADD CONSTRAINT "BlockTransform_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockTransform" ADD CONSTRAINT "BlockTransform_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockTransform" ADD CONSTRAINT "BlockTransform_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPart" ADD CONSTRAINT "BlockPart_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPart" ADD CONSTRAINT "BlockPart_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPart" ADD CONSTRAINT "BlockPart_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPart" ADD CONSTRAINT "BlockPart_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringType" ADD CONSTRAINT "StringType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringType" ADD CONSTRAINT "StringType_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringType" ADD CONSTRAINT "StringType_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringType" ADD CONSTRAINT "StringType_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringCommand" ADD CONSTRAINT "StringCommand_stringTypeId_fkey" FOREIGN KEY ("stringTypeId") REFERENCES "StringType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringCommand" ADD CONSTRAINT "StringCommand_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringCommand" ADD CONSTRAINT "StringCommand_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StringCommand" ADD CONSTRAINT "StringCommand_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Struct" ADD CONSTRAINT "Struct_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Struct" ADD CONSTRAINT "Struct_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Struct" ADD CONSTRAINT "Struct_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Struct" ADD CONSTRAINT "Struct_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ScribeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.can_view_project(projectId TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "ScribeProject" sp
    WHERE sp."id" = projectId AND sp."deletedAt" IS NULL
    AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()) OR EXISTS (
        SELECT 1 FROM "ProjectUser" pu
        WHERE pu."projectId" = sp."id"
        AND pu."userId" = (SELECT auth.uid())
        AND pu."deletedAt" is null
    )));
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project(projectId TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "ScribeProject" sp
    WHERE sp."id" = projectId AND sp."deletedAt" IS NULL
    AND ("createdBy" = (SELECT auth.uid()) OR EXISTS (
        SELECT 1 FROM "ProjectUser" pu
        WHERE pu."projectId" = sp."id"
        AND pu."userId" = (SELECT auth.uid())
        AND pu."deletedAt" is null
    )));
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_project_block(blockId TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Block" b
    WHERE b."id" = blockId AND b."deletedAt" IS NULL
    AND public.can_view_project(b."projectId")
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project_block(blockId TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Block" b
    WHERE b."id" = blockId AND b."deletedAt" IS NULL
    AND public.can_edit_project(b."projectId")
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project(projectId TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "ScribeProject" sp
    WHERE sp."id" = projectId AND sp."deletedAt" IS NULL
    AND ("createdBy" = (SELECT auth.uid()) OR EXISTS (
        SELECT 1 FROM "ProjectUser" pu
        WHERE pu."projectId" = sp."id"
        AND pu."userId" = (SELECT auth.uid())
        AND pu."deletedAt" is null
        AND pu."role" IN ('admin', 'owner', 'manager')
    )));
END;
$$;

CREATE OR REPLACE PROCEDURE create_child_table_policies(table_name text)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Enable RLS on the target table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
  
  -- Create policy for public viewing
  EXECUTE format(
    'CREATE POLICY "Public project %ss is viewable by everyone" ON %I FOR SELECT TO anon, authenticated USING (public.can_view_project("projectId"));',
    table_name,
    table_name
  );
  
  -- Create policy for authenticated users to insert cops
  EXECUTE format(
    'CREATE POLICY "Users can create %ss in their projects" ON %I FOR INSERT TO authenticated WITH CHECK (public.can_edit_project("projectId") AND "createdBy" = (SELECT auth.uid()));',
    table_name,
    table_name
  );
  
  -- Create policy for authenticated users to update cops
  EXECUTE format(
    'CREATE POLICY "Users can modify %ss in their projects" ON %I FOR UPDATE TO authenticated USING (public.can_edit_project("projectId")) WITH CHECK (public.can_edit_project("projectId"));',
    table_name,
    table_name
  );
END;
$$;

CREATE OR REPLACE PROCEDURE create_block_table_policies(table_name text)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Enable RLS on the target table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
  
  -- Create policy for public viewing
  EXECUTE format(
    'CREATE POLICY "Public project %ss is viewable by everyone" ON %I FOR SELECT TO anon, authenticated USING (public.can_view_project_block("blockId"));',
    table_name,
    table_name
  );
  
  -- Create policy for authenticated users to insert cops
  EXECUTE format(
    'CREATE POLICY "Users can create %ss in their projects" ON %I FOR INSERT TO authenticated WITH CHECK (public.can_edit_project_block("blockId") AND "createdBy" = (SELECT auth.uid()));',
    table_name,
    table_name
  );
  
  -- Create policy for authenticated users to update cops
  EXECUTE format(
    'CREATE POLICY "Users can modify %ss in their projects" ON %I FOR UPDATE TO authenticated USING (public.can_edit_project_block("blockId")) WITH CHECK (public.can_edit_project_block("blockId"));',
    table_name,
    table_name
  );
END;
$$;

DO $$
BEGIN
  -- Check if we're in a Supabase/production environment by looking for specific extensions
  -- Also check if auth schema exists to avoid shadow database issues
  IF (EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') OR
      EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin')) AND
     EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    
    -- Grant SELECT access to anon and authenticated on all tables
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    
    -- CRITICAL: Grant permissions for User table to authenticated users
    GRANT SELECT, INSERT, UPDATE, DELETE ON "User" TO authenticated;

    -- Grant permissions for ProjectUser table to authenticated users
    GRANT SELECT, INSERT, UPDATE, DELETE ON "ProjectUser" TO authenticated;

    
    -- ====================================
    -- USER TABLE POLICIES
    -- ====================================
    ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
    
    -- Users can only see their own profile and public project creators
    CREATE POLICY "Users can view other user's profile"
    ON "User"
    FOR SELECT
    TO authenticated
    USING ("deletedAt" IS NULL);
    
    -- Users can update their own profile
    CREATE POLICY "Users can update their own profile"
    ON "User"
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);
    
    -- Users can create their own profile (CRITICAL for initial signup)
    CREATE POLICY "Users can create their own profile"
    ON "User"
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);
    
    -- ====================================
    -- SCRIBE PROJECT POLICIES
    -- ====================================
    ALTER TABLE "ScribeProject" ENABLE ROW LEVEL SECURITY;
    
    -- Authenticated users can view public projects
    CREATE POLICY "Public or owned projects are viewable by everyone"
    ON "ScribeProject"
    FOR SELECT
    TO anon, authenticated
    USING ("deletedAt" IS NULL 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()) OR EXISTS (
            SELECT 1 FROM "ProjectUser" pu
            WHERE pu."projectId" = "projectId"
            AND pu."userId" = (SELECT auth.uid())
            AND pu."deletedAt" is null))
    );
    
    -- Authenticated users can create projects
    CREATE POLICY "Users can create projects"
    ON "ScribeProject"
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = "createdBy" AND "deletedAt" IS NULL);
    
    -- Authenticated users can update their own projects and projects they contribute to
    CREATE POLICY "Users can update their own projects and contributed projects"
    ON "ScribeProject"
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = "createdBy" AND "deletedAt" IS NULL)
    WITH CHECK ((SELECT auth.uid()) = "createdBy" AND "deletedAt" IS NULL);

    -- ====================================
    -- PROJECT USER POLICIES
    -- ====================================
    ALTER TABLE "ProjectUser" ENABLE ROW LEVEL SECURITY;

    
    CREATE POLICY "Project contributors should be visible"
    ON "ProjectUser"
    FOR SELECT
    TO authenticated
    USING (
    --   EXISTS (
    --     SELECT 1 FROM "ScribeProject" p
    --     WHERE p."id" = "ProjectUser"."projectId"
    --     AND p."deletedAt" IS NULL
    --     AND p."createdBy" = (SELECT auth.uid())  -- Only project owners, no ProjectUser recursion
    --   )
    --   AND 
      "deletedAt" IS NULL
    );


    -- Project owners can add contributors
    CREATE POLICY "Project owners can add contributors"
    ON "ProjectUser"
    FOR INSERT
    TO authenticated
    WITH CHECK (public.can_manage_project("projectId") AND "createdBy" = (SELECT auth.uid()));

    -- Project owners can update contributor roles
    CREATE POLICY "Project owners can update contributors"
    ON "ProjectUser"
    FOR UPDATE
    TO authenticated
    USING (public.can_manage_project("projectId"))
    WITH CHECK (public.can_manage_project("projectId"));

    -- COP TABLE POLICIES
    CALL create_child_table_policies('Cop');
    CALL create_child_table_policies('Label');
    CALL create_child_table_policies('Rewrite');
    CALL create_child_table_policies('GameMnemonic');
    CALL create_child_table_policies('Override');
    CALL create_child_table_policies('File');
    CALL create_child_table_policies('Block');

    -- ====================================
    -- BLOCK TRANSFORM TABLE POLICIES
    -- ====================================
    CALL create_block_table_policies('BlockTransform');
    
    -- ====================================
    -- BLOCK PART TABLE POLICIES
    -- ====================================
    CALL create_block_table_policies('BlockPart');

    -- ====================================
    -- BLOCK ARTIFACT TABLE POLICIES
    -- ====================================
    CALL create_block_table_policies('BlockArtifact');
    
    -- ====================================
    -- STRING TYPE TABLE POLICIES
    -- ====================================
    CALL create_child_table_policies('StringType');
    
    -- ====================================
    -- STRING COMMAND TABLE POLICIES
    -- ====================================
    ALTER TABLE "StringCommand" ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Public project string commands are viewable by everyone"
    ON "StringCommand"
    FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM "StringType" st
        WHERE st."id" = "stringTypeId" AND st."deletedAt" IS NULL
        AND public.can_view_project(st."projectId")
    ));

    CREATE POLICY "Users can create string commands in their projects"
    ON "StringCommand"
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM "StringType" st
        WHERE st."id" = "stringTypeId" AND st."deletedAt" IS NULL
        AND public.can_edit_project(st."projectId")
    ) AND "createdBy" = (SELECT auth.uid()));

    CREATE POLICY "Users can modify string commands in their projects"
    ON "StringCommand"
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "StringType" st
        WHERE st."id" = "stringTypeId" AND st."deletedAt" IS NULL
        AND public.can_edit_project(st."projectId")
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "StringType" st
        WHERE st."id" = "stringTypeId" AND st."deletedAt" IS NULL
        AND public.can_edit_project(st."projectId")
    ));
    
    -- ====================================
    -- STRUCT TABLE POLICIES
    -- ====================================
    CALL create_child_table_policies('Struct');
    
    
    -- ====================================
    -- REALTIME SETUP FOR COLLABORATIVE EDITING
    -- ====================================
    
    -- Enable realtime for all tables to support collaborative editing
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime;
    
    -- Add all tables to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE "ScribeProject";
    ALTER PUBLICATION supabase_realtime ADD TABLE "ProjectUser";
    ALTER PUBLICATION supabase_realtime ADD TABLE "Cop";
    ALTER PUBLICATION supabase_realtime ADD TABLE "Label";
    ALTER PUBLICATION supabase_realtime ADD TABLE "Rewrite";
    ALTER PUBLICATION supabase_realtime ADD TABLE "GameMnemonic";
    ALTER PUBLICATION supabase_realtime ADD TABLE "Override";
    ALTER PUBLICATION supabase_realtime ADD TABLE "File";
    ALTER PUBLICATION supabase_realtime ADD TABLE "Block";
    ALTER PUBLICATION supabase_realtime ADD TABLE "BlockTransform";
    ALTER PUBLICATION supabase_realtime ADD TABLE "BlockPart";
    ALTER PUBLICATION supabase_realtime ADD TABLE "StringType";
    ALTER PUBLICATION supabase_realtime ADD TABLE "StringCommand";
    ALTER PUBLICATION supabase_realtime ADD TABLE "Struct";
    
    -- ====================================
    -- PRISMA MIGRATIONS TABLE SECURITY
    -- ====================================
    
    -- Enable RLS on the Prisma migrations table for security
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
    
    -- Create restrictive policy - deny all access to anon and authenticated users
    CREATE POLICY "Deny all access to migrations table for regular users"
    ON "_prisma_migrations"
    FOR ALL
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);
    
    -- Note: Only service roles or roles with bypassrls can access this table
    -- This is intentional - migrations should only be managed by privileged connections

    RAISE NOTICE 'Applied RLS policies and grants for production environment';
  ELSE
    RAISE NOTICE 'Skipped RLS setup - not in production environment';
  END IF;
END
$$;
