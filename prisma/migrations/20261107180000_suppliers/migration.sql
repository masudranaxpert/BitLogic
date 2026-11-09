-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "apiKeyHint" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "purchasingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalMin" INTEGER NOT NULL DEFAULT 15,
    "lowBalanceAlert" REAL NOT NULL DEFAULT 5,
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT NOT NULL DEFAULT '',
    "lastSyncError" TEXT NOT NULL DEFAULT '',
    "balance" TEXT NOT NULL DEFAULT '',
    "balanceAt" DATETIME,
    "webhookSecretEnc" TEXT NOT NULL DEFAULT '',
    "webhookUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "productRef" TEXT NOT NULL,
    "variantRef" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "variantName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT '',
    "price" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "stock" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'available',
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER NOT NULL DEFAULT 100,
    "deliveryType" TEXT NOT NULL DEFAULT 'instant',
    "needsBuyerInput" BOOLEAN NOT NULL DEFAULT false,
    "previousPrice" TEXT NOT NULL DEFAULT '',
    "priceChangedAt" DATETIME,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanSupplierLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanSupplierLink_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ProductPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanSupplierLink_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "externalOrderId" TEXT NOT NULL DEFAULT '',
    "externalStatus" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT '',
    "costBdt" INTEGER NOT NULL DEFAULT 0,
    "salePriceBdt" INTEGER NOT NULL DEFAULT 0,
    "requestJson" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextPollAt" DATETIME,
    "errorCode" TEXT NOT NULL DEFAULT '',
    "lastError" TEXT NOT NULL DEFAULT '',
    "deliveryHash" TEXT NOT NULL DEFAULT '',
    "resultEnc" TEXT NOT NULL DEFAULT '',
    "productLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deliveredAt" DATETIME,
    CONSTRAINT "SupplierOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "planLabel" TEXT NOT NULL DEFAULT '',
    "field" TEXT NOT NULL DEFAULT 'price',
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "bdtPerUnit" REAL NOT NULL,
    "updatedBy" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "credentialSchemeId" TEXT,
    "credentialType" TEXT NOT NULL DEFAULT 'email_login',
    "deliveryMode" TEXT NOT NULL DEFAULT 'auto_vault',
    "stockDisplayMode" TEXT NOT NULL DEFAULT 'exact_count',
    "vpnRequired" BOOLEAN NOT NULL DEFAULT false,
    "vpnRegionNote" TEXT NOT NULL DEFAULT '',
    "hasWarranty" BOOLEAN NOT NULL DEFAULT true,
    "warrantyDays" INTEGER NOT NULL DEFAULT 0,
    "deviceLimit" TEXT NOT NULL DEFAULT '',
    "importantNote" TEXT NOT NULL DEFAULT '',
    "warningNote" TEXT NOT NULL DEFAULT '',
    "optionDescription" TEXT NOT NULL DEFAULT '',
    "specificationsJson" TEXT NOT NULL DEFAULT '[]',
    "sourcing" TEXT NOT NULL DEFAULT 'own',
    "pricingMode" TEXT NOT NULL DEFAULT 'fixed',
    "markupPercent" REAL NOT NULL DEFAULT 20,
    "markupFlatBdt" INTEGER NOT NULL DEFAULT 0,
    "roundToBdt" INTEGER NOT NULL DEFAULT 10,
    "minMarginBdt" INTEGER NOT NULL DEFAULT 0,
    "renewalPricing" TEXT NOT NULL DEFAULT 'current',
    "allowBackorder" BOOLEAN,
    "pricingAlert" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductPlan" ("code", "createdAt", "credentialSchemeId", "credentialType", "deliveryMode", "detailsJson", "deviceLimit", "durationDays", "durationLabel", "hasWarranty", "id", "importantNote", "isActive", "isDefault", "label", "optionDescription", "priceBdt", "productId", "specificationsJson", "stockDisplayMode", "updatedAt", "vpnRegionNote", "vpnRequired", "warningNote", "warrantyBadge", "warrantyDays", "warrantyHeadline", "warrantyType") SELECT "code", "createdAt", "credentialSchemeId", "credentialType", "deliveryMode", "detailsJson", "deviceLimit", "durationDays", "durationLabel", "hasWarranty", "id", "importantNote", "isActive", "isDefault", "label", "optionDescription", "priceBdt", "productId", "specificationsJson", "stockDisplayMode", "updatedAt", "vpnRegionNote", "vpnRequired", "warningNote", "warrantyBadge", "warrantyDays", "warrantyHeadline", "warrantyType" FROM "ProductPlan";
DROP TABLE "ProductPlan";
ALTER TABLE "new_ProductPlan" RENAME TO "ProductPlan";
CREATE INDEX "ProductPlan_productId_idx" ON "ProductPlan"("productId");
CREATE UNIQUE INDEX "ProductPlan_productId_code_key" ON "ProductPlan"("productId", "code");
CREATE TABLE "new_DigitalDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "createdAtLabel" TEXT NOT NULL,
    "deliveredAt" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vaultCredentialId" TEXT,
    "vpnRequired" BOOLEAN NOT NULL DEFAULT false,
    "vpnRegionNote" TEXT NOT NULL DEFAULT '',
    "hasWarranty" BOOLEAN NOT NULL DEFAULT false,
    "warrantyDays" INTEGER NOT NULL DEFAULT 0,
    "warrantyRemainingDays" INTEGER NOT NULL DEFAULT 0,
    "warrantyStartsAt" TEXT,
    "warrantyEndsAt" TEXT,
    "nextWarrantyStartsAt" TEXT,
    "nextWarrantyEndsAt" TEXT,
    "warrantyTerms" TEXT NOT NULL DEFAULT '',
    "warrantyClaimReason" TEXT,
    "replacementHistoryCount" INTEGER NOT NULL DEFAULT 0,
    "loginInstructionsJson" TEXT NOT NULL DEFAULT '[]',
    "customAdminNote" TEXT NOT NULL DEFAULT '',
    "unreadChatCount" INTEGER NOT NULL DEFAULT 0,
    "chatMessagesJson" TEXT NOT NULL DEFAULT '[]',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "orderExpiresAt" TEXT,
    "credentialValidDays" INTEGER NOT NULL DEFAULT 30,
    "credentialAssignedAt" TEXT,
    "credentialExpiresAt" TEXT,
    "renewalPending" BOOLEAN NOT NULL DEFAULT false,
    "supplierState" TEXT NOT NULL DEFAULT '',
    "supplierRev" INTEGER NOT NULL DEFAULT 0,
    "credentialClearedAt" TEXT,
    "orderQuantity" INTEGER NOT NULL DEFAULT 1,
    "unitIndex" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DigitalDelivery" ("buyerEmail", "buyerName", "buyerPhone", "chatMessagesJson", "createdAt", "createdAtLabel", "credentialAssignedAt", "credentialClearedAt", "credentialExpiresAt", "credentialType", "credentialValidDays", "customAdminNote", "deliveredAt", "deliveryMode", "hasWarranty", "id", "loginInstructionsJson", "nextWarrantyEndsAt", "nextWarrantyStartsAt", "orderExpiresAt", "orderId", "orderQuantity", "pinned", "productId", "productName", "renewalPending", "replacementHistoryCount", "status", "unitIndex", "unreadChatCount", "updatedAt", "variantId", "variantName", "vaultCredentialId", "vpnRegionNote", "vpnRequired", "warrantyClaimReason", "warrantyDays", "warrantyEndsAt", "warrantyRemainingDays", "warrantyStartsAt", "warrantyTerms") SELECT "buyerEmail", "buyerName", "buyerPhone", "chatMessagesJson", "createdAt", "createdAtLabel", "credentialAssignedAt", "credentialClearedAt", "credentialExpiresAt", "credentialType", "credentialValidDays", "customAdminNote", "deliveredAt", "deliveryMode", "hasWarranty", "id", "loginInstructionsJson", "nextWarrantyEndsAt", "nextWarrantyStartsAt", "orderExpiresAt", "orderId", "orderQuantity", "pinned", "productId", "productName", "renewalPending", "replacementHistoryCount", "status", "unitIndex", "unreadChatCount", "updatedAt", "variantId", "variantName", "vaultCredentialId", "vpnRegionNote", "vpnRequired", "warrantyClaimReason", "warrantyDays", "warrantyEndsAt", "warrantyRemainingDays", "warrantyStartsAt", "warrantyTerms" FROM "DigitalDelivery";
DROP TABLE "DigitalDelivery";
ALTER TABLE "new_DigitalDelivery" RENAME TO "DigitalDelivery";
CREATE INDEX "DigitalDelivery_status_idx" ON "DigitalDelivery"("status");
CREATE INDEX "DigitalDelivery_orderId_idx" ON "DigitalDelivery"("orderId");
CREATE INDEX "DigitalDelivery_vaultCredentialId_idx" ON "DigitalDelivery"("vaultCredentialId");
CREATE INDEX "DigitalDelivery_pinned_idx" ON "DigitalDelivery"("pinned");
CREATE INDEX "DigitalDelivery_renewalPending_idx" ON "DigitalDelivery"("renewalPending");
CREATE INDEX "DigitalDelivery_credentialExpiresAt_idx" ON "DigitalDelivery"("credentialExpiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SupplierProduct_status_idx" ON "SupplierProduct"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_externalId_key" ON "SupplierProduct"("supplierId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanSupplierLink_planId_supplierProductId_key" ON "PlanSupplierLink"("planId", "supplierProductId");

-- CreateIndex
CREATE INDEX "SupplierOrder_status_idx" ON "SupplierOrder"("status");

-- CreateIndex
CREATE INDEX "SupplierOrder_orderId_idx" ON "SupplierOrder"("orderId");

-- CreateIndex
CREATE INDEX "SupplierOrder_deliveryId_idx" ON "SupplierOrder"("deliveryId");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_createdAt_idx" ON "PriceHistory"("productId", "createdAt");

