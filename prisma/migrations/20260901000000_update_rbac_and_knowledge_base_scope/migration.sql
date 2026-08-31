-- AlterTable KnowledgeSource
ALTER TABLE "KnowledgeSource" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'ORGANIZATION',
ALTER COLUMN "type" SET DEFAULT 'FILE',
ALTER COLUMN "status" SET DEFAULT 'PROCESSED';

-- AlterTable Workflow
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeSource_organizationId_name_scope_createdByUserId_key" ON "KnowledgeSource"("organizationId", "name", "scope", "createdByUserId");

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
