-- AlterTable
ALTER TABLE "Order" ADD COLUMN "accessToken" TEXT;
CREATE INDEX IF NOT EXISTS "Order_accessToken_idx" ON "Order"("accessToken");
