-- DropIndex
DROP INDEX "tradeHistory_trade_date_settlement_category_order_id_contra_key";

-- AlterTable
ALTER TABLE "tradeHistory" ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "tradeHistory_pkey" PRIMARY KEY ("id");
