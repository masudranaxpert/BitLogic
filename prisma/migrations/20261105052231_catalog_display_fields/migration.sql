/*
  Warnings:

  - Added the required column `code` to the `ProductPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationLabel` to the `ProductPlan` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "galleryJson" TEXT NOT NULL DEFAULT '[]',
    "featuresJson" TEXT NOT NULL DEFAULT '[]',
    "badge" TEXT,
    "sale" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "createdAt", "description", "id", "imageUrl", "isActive", "name", "slug", "updatedAt") SELECT "category", "createdAt", "description", "id", "imageUrl", "isActive", "name", "slug", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE TABLE "new_ProductPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationLabel" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceBdt" DECIMAL NOT NULL,
    "warrantyBadge" TEXT,
    "warrantyType" TEXT,
    "warrantyHeadline" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductPlan" ("createdAt", "durationDays", "id", "isActive", "label", "priceBdt", "productId", "updatedAt") SELECT "createdAt", "durationDays", "id", "isActive", "label", "priceBdt", "productId", "updatedAt" FROM "ProductPlan";
DROP TABLE "ProductPlan";
ALTER TABLE "new_ProductPlan" RENAME TO "ProductPlan";
CREATE INDEX "ProductPlan_productId_idx" ON "ProductPlan"("productId");
CREATE UNIQUE INDEX "ProductPlan_productId_code_key" ON "ProductPlan"("productId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
