/*
  Warnings:

  - Added the required column `platformId` to the `ScribeProject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ScribeProject" ADD COLUMN     "platformId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AddressingMode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "format" TEXT,
    "pattern" TEXT,
    "meta" JSONB,
    "platformId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "AddressingMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InstructionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meta" JSONB,
    "platformId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "InstructionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InstructionCode" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "cycles" INTEGER,
    "meta" JSONB,
    "groupId" TEXT NOT NULL,
    "modeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "InstructionCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" INTEGER NOT NULL,
    "isEntry" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "platformId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "Vector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Platform_createdBy_idx" ON "public"."Platform"("createdBy");

-- CreateIndex
CREATE INDEX "Platform_updatedBy_idx" ON "public"."Platform"("updatedBy");

-- CreateIndex
CREATE INDEX "Platform_deletedBy_idx" ON "public"."Platform"("deletedBy");

-- CreateIndex
CREATE INDEX "AddressingMode_platformId_idx" ON "public"."AddressingMode"("platformId");

-- CreateIndex
CREATE INDEX "AddressingMode_createdBy_idx" ON "public"."AddressingMode"("createdBy");

-- CreateIndex
CREATE INDEX "AddressingMode_updatedBy_idx" ON "public"."AddressingMode"("updatedBy");

-- CreateIndex
CREATE INDEX "AddressingMode_deletedBy_idx" ON "public"."AddressingMode"("deletedBy");

-- CreateIndex
CREATE INDEX "InstructionGroup_platformId_idx" ON "public"."InstructionGroup"("platformId");

-- CreateIndex
CREATE INDEX "InstructionGroup_createdBy_idx" ON "public"."InstructionGroup"("createdBy");

-- CreateIndex
CREATE INDEX "InstructionGroup_updatedBy_idx" ON "public"."InstructionGroup"("updatedBy");

-- CreateIndex
CREATE INDEX "InstructionGroup_deletedBy_idx" ON "public"."InstructionGroup"("deletedBy");

-- CreateIndex
CREATE UNIQUE INDEX "InstructionGroup_platformId_name_key" ON "public"."InstructionGroup"("platformId", "name");

-- CreateIndex
CREATE INDEX "InstructionCode_groupId_idx" ON "public"."InstructionCode"("groupId");

-- CreateIndex
CREATE INDEX "InstructionCode_modeId_idx" ON "public"."InstructionCode"("modeId");

-- CreateIndex
CREATE INDEX "InstructionCode_createdBy_idx" ON "public"."InstructionCode"("createdBy");

-- CreateIndex
CREATE INDEX "InstructionCode_updatedBy_idx" ON "public"."InstructionCode"("updatedBy");

-- CreateIndex
CREATE INDEX "InstructionCode_deletedBy_idx" ON "public"."InstructionCode"("deletedBy");

-- CreateIndex
CREATE INDEX "Vector_platformId_idx" ON "public"."Vector"("platformId");

-- CreateIndex
CREATE INDEX "Vector_createdBy_idx" ON "public"."Vector"("createdBy");

-- CreateIndex
CREATE INDEX "Vector_updatedBy_idx" ON "public"."Vector"("updatedBy");

-- CreateIndex
CREATE INDEX "Vector_deletedBy_idx" ON "public"."Vector"("deletedBy");

-- AddForeignKey
ALTER TABLE "public"."ScribeProject" ADD CONSTRAINT "ScribeProject_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Platform" ADD CONSTRAINT "Platform_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Platform" ADD CONSTRAINT "Platform_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Platform" ADD CONSTRAINT "Platform_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AddressingMode" ADD CONSTRAINT "AddressingMode_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AddressingMode" ADD CONSTRAINT "AddressingMode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AddressingMode" ADD CONSTRAINT "AddressingMode_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AddressingMode" ADD CONSTRAINT "AddressingMode_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionGroup" ADD CONSTRAINT "InstructionGroup_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionGroup" ADD CONSTRAINT "InstructionGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionGroup" ADD CONSTRAINT "InstructionGroup_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionGroup" ADD CONSTRAINT "InstructionGroup_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionCode" ADD CONSTRAINT "InstructionCode_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."InstructionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionCode" ADD CONSTRAINT "InstructionCode_modeId_fkey" FOREIGN KEY ("modeId") REFERENCES "public"."AddressingMode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionCode" ADD CONSTRAINT "InstructionCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionCode" ADD CONSTRAINT "InstructionCode_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionCode" ADD CONSTRAINT "InstructionCode_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vector" ADD CONSTRAINT "Vector_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vector" ADD CONSTRAINT "Vector_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vector" ADD CONSTRAINT "Vector_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vector" ADD CONSTRAINT "Vector_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.can_view_platform(platformId TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Platform" p
    WHERE p."id" = platformId AND p."deletedAt" IS NULL
    AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid())));
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_platform(platformId TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Platform" p
    WHERE p."id" = platformId AND p."deletedAt" IS NULL
    AND "createdBy" = (SELECT auth.uid()));
END;
$$;

CREATE OR REPLACE PROCEDURE create_platform_table_policies(table_name text)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Enable RLS on the target table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
  
  -- Create policy for public viewing
  EXECUTE format(
    'CREATE POLICY "Public platform %ss is viewable by everyone" ON %I FOR SELECT TO anon, authenticated USING (public.can_view_platform("platformId"));',
    table_name,
    table_name
  );
  
  -- Create policy for authenticated users to insert cops
  EXECUTE format(
    'CREATE POLICY "Users can create %ss in their platforms" ON %I FOR INSERT TO authenticated WITH CHECK (public.can_edit_platform("platformId") AND "createdBy" = (SELECT auth.uid()));',
    table_name,
    table_name
  );
  
  -- Create policy for authenticated users to update cops
  EXECUTE format(
    'CREATE POLICY "Users can modify %ss in their platforms" ON %I FOR UPDATE TO authenticated USING (public.can_edit_platform("platformId")) WITH CHECK (public.can_edit_platform("platformId"));',
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
    
    -- Grant SELECT access to anon and authenticated on all tables
    GRANT SELECT ON "Platform" TO anon, authenticated;
    GRANT SELECT ON "AddressingMode" TO anon, authenticated;
    GRANT SELECT ON "InstructionGroup" TO anon, authenticated;
    GRANT SELECT ON "InstructionCode" TO anon, authenticated;
    GRANT SELECT ON "Vector" TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON "Platform" TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON "AddressingMode" TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON "InstructionGroup" TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON "InstructionCode" TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON "Vector" TO authenticated;
    
    -- ====================================
    -- PLATFORM PROJECT POLICIES
    -- ====================================
    ALTER TABLE "Platform" ENABLE ROW LEVEL SECURITY;
    
    -- Authenticated users can view public projects
    CREATE POLICY "Public or owned platforms are viewable by everyone"
    ON "Platform"
    FOR SELECT
    TO authenticated
    USING ("deletedAt" IS NULL 
        AND ("isPublic" = true OR "createdBy" = (SELECT auth.uid()))
    );
    
    -- Authenticated users can create projects
    CREATE POLICY "Users can create platforms"
    ON "Platform"
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = "createdBy" AND "deletedAt" IS NULL);
    
    -- Authenticated users can update their own projects and projects they contribute to
    CREATE POLICY "Users can update their own platforms"
    ON "Platform"
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = "createdBy" AND "deletedAt" IS NULL)
    WITH CHECK ((SELECT auth.uid()) = "createdBy" AND "deletedAt" IS NULL);

    -- ====================================
    -- ADDRESSING MODE POLICIES
    -- ====================================
    CALL create_platform_table_policies('AddressingMode');

    -- ====================================
    -- INSTRUCTION GROUP POLICIES
    -- ====================================
    CALL create_platform_table_policies('InstructionGroup');
    
    -- ====================================
    -- INSTRUCTION CODE POLICIES
    -- ====================================
    ALTER TABLE "InstructionCode" ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Public instruction codes are viewable by everyone"
    ON "InstructionCode"
    FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM "InstructionGroup" ig
        WHERE ig."id" = "InstructionCode"."groupId" AND ig."deletedAt" IS NULL
        AND public.can_view_platform(ig."platformId")
    ));

    CREATE POLICY "Users can create instruction codes in their platforms"
    ON "InstructionCode"
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM "InstructionGroup" ig
        WHERE ig."id" = "InstructionCode"."groupId" AND ig."deletedAt" IS NULL
        AND public.can_edit_platform(ig."platformId")
    ) AND "createdBy" = (SELECT auth.uid()));

    CREATE POLICY "Users can modify instruction codes in their platforms"
    ON "InstructionCode"
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "InstructionGroup" ig
        WHERE ig."id" = "InstructionCode"."groupId" AND ig."deletedAt" IS NULL
        AND public.can_edit_platform(ig."platformId")
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "InstructionGroup" ig
        WHERE ig."id" = "InstructionCode"."groupId" AND ig."deletedAt" IS NULL
        AND public.can_edit_platform(ig."platformId")
    ));

    -- ====================================
    -- VECTOR POLICIES
    -- ====================================
    CALL create_platform_table_policies('Vector');
    
    -- ====================================
    -- REALTIME SETUP FOR COLLABORATIVE EDITING
    -- ====================================
    ALTER PUBLICATION supabase_realtime ADD TABLE "Platform";
    ALTER PUBLICATION supabase_realtime ADD TABLE "AddressingMode";
    ALTER PUBLICATION supabase_realtime ADD TABLE "InstructionGroup";
    ALTER PUBLICATION supabase_realtime ADD TABLE "InstructionCode";
    ALTER PUBLICATION supabase_realtime ADD TABLE "Vector";
    
    RAISE NOTICE 'Applied RLS policies and grants for production environment';
  ELSE
    RAISE NOTICE 'Skipped RLS setup - not in production environment';
  END IF;
END
$$;
