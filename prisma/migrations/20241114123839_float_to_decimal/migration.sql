/*
  Warnings:

  - You are about to alter the column `bid_price` on the `brandBidAsk` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `ask_price` on the `brandBidAsk` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `yen_payment` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `contract_amount` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `contract_rate` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `contract_payment` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `order_commission` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `leverage_commission` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `deposit_withdrawal_amount` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `givetake_amount` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `sending_commission` on the `tradeHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "brandBidAsk" ALTER COLUMN "bid_price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "ask_price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "tradeHistory" ALTER COLUMN "yen_payment" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "contract_amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "contract_rate" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "contract_payment" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "order_commission" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "leverage_commission" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "deposit_withdrawal_amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "givetake_amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "sending_commission" SET DATA TYPE DECIMAL(65,30);
