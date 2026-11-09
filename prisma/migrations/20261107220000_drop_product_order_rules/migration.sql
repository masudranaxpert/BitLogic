-- Renewals, stock-out orders, and the order window live on ProductPlan.
ALTER TABLE "Product" DROP COLUMN "renewable";
ALTER TABLE "Product" DROP COLUMN "allowOrderWhenOutOfStock";
ALTER TABLE "Product" DROP COLUMN "availableFrom";
ALTER TABLE "Product" DROP COLUMN "availableUntil";
