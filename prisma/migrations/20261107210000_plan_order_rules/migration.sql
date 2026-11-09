ALTER TABLE "ProductPlan" ADD COLUMN "renewable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProductPlan" ADD COLUMN "availableFrom" DATETIME;
ALTER TABLE "ProductPlan" ADD COLUMN "availableUntil" DATETIME;

UPDATE "ProductPlan"
SET "renewable" = (
  SELECT "renewable" FROM "Product" WHERE "Product"."id" = "ProductPlan"."productId"
);

UPDATE "ProductPlan"
SET "allowBackorder" = (
  SELECT "allowOrderWhenOutOfStock" FROM "Product" WHERE "Product"."id" = "ProductPlan"."productId"
)
WHERE "allowBackorder" IS NULL;

UPDATE "ProductPlan"
SET
  "availableFrom" = (SELECT "availableFrom" FROM "Product" WHERE "Product"."id" = "ProductPlan"."productId"),
  "availableUntil" = (SELECT "availableUntil" FROM "Product" WHERE "Product"."id" = "ProductPlan"."productId");
