-- AlterTable
ALTER TABLE "public"."Cop" ALTER COLUMN "halt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."PlatformType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" INTEGER NOT NULL,
    "isPrimitive" BOOLEAN NOT NULL DEFAULT false,
    "isPointer" BOOLEAN NOT NULL DEFAULT false,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "isRelative" BOOLEAN NOT NULL DEFAULT false,
    "isBank" BOOLEAN NOT NULL DEFAULT false,
    "isData" BOOLEAN NOT NULL DEFAULT false,
    "isCode" BOOLEAN NOT NULL DEFAULT false,
    "pointerChar" TEXT,
    "meta" JSONB,
    "platformId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "PlatformType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformType_platformId_idx" ON "public"."PlatformType"("platformId");

-- CreateIndex
CREATE INDEX "PlatformType_createdBy_idx" ON "public"."PlatformType"("createdBy");

-- CreateIndex
CREATE INDEX "PlatformType_updatedBy_idx" ON "public"."PlatformType"("updatedBy");

-- CreateIndex
CREATE INDEX "PlatformType_deletedBy_idx" ON "public"."PlatformType"("deletedBy");

-- AddForeignKey
ALTER TABLE "public"."PlatformType" ADD CONSTRAINT "PlatformType_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformType" ADD CONSTRAINT "PlatformType_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformType" ADD CONSTRAINT "PlatformType_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformType" ADD CONSTRAINT "PlatformType_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Vector" RENAME COLUMN "isEntry" TO "isEntryPoint";
ALTER TABLE "public"."Vector" ADD COLUMN "description" TEXT,
ADD COLUMN "isRomHeader" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  -- Check if we're in a Supabase/production environment by looking for specific extensions
  -- Also check if auth schema exists to avoid shadow database issues
  IF (EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') OR
      EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin')) AND
     EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    
    -- Grant SELECT access to anon and authenticated on all tables
    GRANT SELECT ON "PlatformType" TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON "PlatformType" TO authenticated;
    
    -- ====================================
    -- PLATFORM PROJECT POLICIES
    -- ====================================
    ALTER TABLE "PlatformType" ENABLE ROW LEVEL SECURITY;
    
    -- Authenticated users can view public projects
    CREATE POLICY "Public or owned platform types are viewable by everyone"
    ON "PlatformType"
    FOR SELECT
    TO anon, authenticated
    USING ("deletedAt" IS NULL AND public.can_view_platform("platformId"));
    
    -- Authenticated users can create projects
    CREATE POLICY "Users can create platform types"
    ON "PlatformType"
    FOR INSERT
    TO authenticated
    WITH CHECK ("deletedAt" IS NULL AND public.can_edit_platform("platformId") AND "createdBy" = (SELECT auth.uid()));
    
    -- Authenticated users can update their own projects and projects they contribute to
    CREATE POLICY "Users can update their own platform types"
    ON "PlatformType"
    FOR UPDATE
    TO authenticated
    USING ("deletedAt" IS NULL AND public.can_edit_platform("platformId"))
    WITH CHECK ("deletedAt" IS NULL AND public.can_edit_platform("platformId"));

    -- ====================================
    -- REALTIME SETUP FOR COLLABORATIVE EDITING
    -- ====================================
    ALTER PUBLICATION supabase_realtime ADD TABLE "PlatformType";
    
    RAISE NOTICE 'Applied RLS policies and grants for production environment';
  ELSE
    RAISE NOTICE 'Skipped RLS setup - not in production environment';
  END IF;
END
$$;
