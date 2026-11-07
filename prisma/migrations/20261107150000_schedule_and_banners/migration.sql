ALTER TABLE "Product" ADD COLUMN "availableFrom" DATETIME;
ALTER TABLE "Product" ADD COLUMN "availableUntil" DATETIME;

CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slot" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT NOT NULL DEFAULT '',
    "linkType" TEXT NOT NULL DEFAULT 'none',
    "linkValue" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "HomeBanner_slot_position_idx" ON "HomeBanner"("slot", "position");
