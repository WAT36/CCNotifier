/*
  Warnings:

  - A unique constraint covering the columns `[trade_date,settlement_category,order_id,contract_id,position_id,transaction_id]` on the table `tradeHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "tradeHistory_order_id_contract_id_position_id_transaction_i_key";

-- CreateIndex
CREATE UNIQUE INDEX "tradeHistory_trade_date_settlement_category_order_id_contra_key" ON "tradeHistory"("trade_date", "settlement_category", "order_id", "contract_id", "position_id", "transaction_id");
