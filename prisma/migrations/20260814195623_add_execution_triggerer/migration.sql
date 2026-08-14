-- AlterTable
ALTER TABLE "WorkflowExecution" ADD COLUMN     "triggeredByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
