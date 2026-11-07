-- AlterTable
ALTER TABLE "User" ADD COLUMN "permissionsJson" TEXT NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
