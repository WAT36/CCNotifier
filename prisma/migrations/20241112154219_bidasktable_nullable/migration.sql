-- AlterTable
ALTER TABLE "brandBidAsk" ALTER COLUMN "bid_price" DROP NOT NULL,
ALTER COLUMN "ask_price" DROP NOT NULL,
ALTER COLUMN "bid_updated_time" DROP NOT NULL,
ALTER COLUMN "ask_updated_time" DROP NOT NULL;
