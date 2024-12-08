-- DropIndex
DROP INDEX "brandBidAsk_brand_key";

-- AlterTable
ALTER TABLE "brandBidAsk" ADD CONSTRAINT "brandBidAsk_pkey" PRIMARY KEY ("brand");
