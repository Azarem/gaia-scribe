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
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScribeProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "gameRomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "Struct_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "ScribeProject_name_key" ON "ScribeProject"("name");

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

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastActiveProjectId_fkey" FOREIGN KEY ("lastActiveProjectId") REFERENCES "ScribeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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


DO $$
BEGIN
  -- Check if we're in a Supabase/production environment by looking for specific extensions
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') OR
     EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    
    GRANT USAGE ON SCHEMA public TO anon;
    
    -- Grant SELECT access to anon and authenticated on all tables
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    
    -- Explicit grants for critical tables to ensure anon access
    GRANT SELECT ON "ScribeProject" TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON "ScribeProject" TO authenticated;
    
    -- Enable Row Level Security on all tables
    ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "ScribeProject" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Cop" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Label" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Rewrite" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "GameMnemonic" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Override" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Block" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "BlockTransform" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "BlockPart" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "StringType" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "StringCommand" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Struct" ENABLE ROW LEVEL SECURITY;
    
    -- ====================================
    -- USER TABLE POLICIES
    -- ====================================
    
    -- Users can only see their own profile and public project creators
    CREATE POLICY "Users can view their own profile"
    ON "User"
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);
    
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
    
    -- Anonymous users can view public projects
    CREATE POLICY "Public projects are viewable by everyone"
    ON "ScribeProject"
    FOR SELECT
    TO anon
    USING ("isPublic" = true);
    
    -- Authenticated users can view public projects
    CREATE POLICY "Authenticated users can view public projects"
    ON "ScribeProject"
    FOR SELECT
    TO authenticated
    USING ("isPublic" = true);
    
    -- Authenticated users can view their own projects
    CREATE POLICY "Users can view their own projects"
    ON "ScribeProject"
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = "createdBy");
    
    -- Authenticated users can create projects
    CREATE POLICY "Users can create projects"
    ON "ScribeProject"
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = "createdBy");
    
    -- Authenticated users can update their own projects
    CREATE POLICY "Users can update their own projects"
    ON "ScribeProject"
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = "createdBy")
    WITH CHECK ((SELECT auth.uid()) = "createdBy");
    
    -- Authenticated users can delete their own projects
    CREATE POLICY "Users can delete their own projects"
    ON "ScribeProject"
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = "createdBy");
    
    -- ====================================
    -- COP TABLE POLICIES
    -- ====================================
    
    -- Anonymous users can view cops from public projects
    CREATE POLICY "Public project cops are viewable by everyone"
    ON "Cop"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    -- Authenticated users can view cops from public projects and their own projects
    CREATE POLICY "Authenticated users can view accessible cops"
    ON "Cop"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    -- Authenticated users can modify cops in their own projects
    CREATE POLICY "Users can modify cops in their projects"
    ON "Cop"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- LABEL TABLE POLICIES
    -- ====================================
    
    -- Anonymous users can view labels from public projects
    CREATE POLICY "Public project labels are viewable by everyone"
    ON "Label"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    -- Authenticated users can view and modify labels in accessible projects
    CREATE POLICY "Authenticated users can view accessible labels"
    ON "Label"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify labels in their projects"
    ON "Label"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- REWRITE TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project rewrites are viewable by everyone"
    ON "Rewrite"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible rewrites"
    ON "Rewrite"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify rewrites in their projects"
    ON "Rewrite"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- GAME MNEMONIC TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project mnemonics are viewable by everyone"
    ON "GameMnemonic"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible mnemonics"
    ON "GameMnemonic"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify mnemonics in their projects"
    ON "GameMnemonic"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- OVERRIDE TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project overrides are viewable by everyone"
    ON "Override"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible overrides"
    ON "Override"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify overrides in their projects"
    ON "Override"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- FILE TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project files are viewable by everyone"
    ON "File"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible files"
    ON "File"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify files in their projects"
    ON "File"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- BLOCK TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project blocks are viewable by everyone"
    ON "Block"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible blocks"
    ON "Block"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify blocks in their projects"
    ON "Block"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- BLOCK TRANSFORM TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project block transforms are viewable by everyone"
    ON "BlockTransform"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" AND sp."isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible block transforms"
    ON "BlockTransform"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" 
        AND (sp."isPublic" = true OR sp."createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify block transforms in their projects"
    ON "BlockTransform"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" AND sp."createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" AND sp."createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- BLOCK PART TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project block parts are viewable by everyone"
    ON "BlockPart"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" AND sp."isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible block parts"
    ON "BlockPart"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" 
        AND (sp."isPublic" = true OR sp."createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify block parts in their projects"
    ON "BlockPart"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" AND sp."createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "Block" b
        JOIN "ScribeProject" sp ON b."projectId" = sp.id
        WHERE b.id = "blockId" AND sp."createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- STRING TYPE TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project string types are viewable by everyone"
    ON "StringType"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible string types"
    ON "StringType"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify string types in their projects"
    ON "StringType"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- STRING COMMAND TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project string commands are viewable by everyone"
    ON "StringCommand"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "StringType" st
        JOIN "ScribeProject" sp ON st."projectId" = sp.id
        WHERE st.id = "stringTypeId" AND sp."isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible string commands"
    ON "StringCommand"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "StringType" st
        JOIN "ScribeProject" sp ON st."projectId" = sp.id
        WHERE st.id = "stringTypeId" 
        AND (sp."isPublic" = true OR sp."createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify string commands in their projects"
    ON "StringCommand"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "StringType" st
        JOIN "ScribeProject" sp ON st."projectId" = sp.id
        WHERE st.id = "stringTypeId" AND sp."createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "StringType" st
        JOIN "ScribeProject" sp ON st."projectId" = sp.id
        WHERE st.id = "stringTypeId" AND sp."createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- STRUCT TABLE POLICIES
    -- ====================================
    
    CREATE POLICY "Public project structs are viewable by everyone"
    ON "Struct"
    FOR SELECT
    TO anon
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "isPublic" = true
    ));
    
    CREATE POLICY "Authenticated users can view accessible structs"
    ON "Struct"
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    ));
    
    CREATE POLICY "Users can modify structs in their projects"
    ON "Struct"
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "ScribeProject" 
        WHERE id = "projectId" AND "createdBy" = (SELECT auth.uid())
    ));
    
    -- ====================================
    -- REALTIME SETUP FOR COLLABORATIVE EDITING
    -- ====================================
    
    -- Enable realtime for all tables to support collaborative editing
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime;
    
    -- Add all tables to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE "ScribeProject";
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