-- AlterTable
ALTER TABLE "public"."Platform" ADD COLUMN     "platformBranchId" TEXT;

-- CreateIndex
CREATE INDEX "Platform_platformBranchId_idx" ON "public"."Platform"("platformBranchId");

-- CreateIndex
CREATE INDEX "ScribeProject_gameRomBranchId_idx" ON "public"."ScribeProject"("gameRomBranchId");
