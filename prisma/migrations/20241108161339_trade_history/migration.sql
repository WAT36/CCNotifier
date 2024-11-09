-- CreateTable
CREATE TABLE "tradeHistory" (
    "trade_date" TIMESTAMP(6) NOT NULL,
    "settlement_category" TEXT NOT NULL,
    "yen_payment" DOUBLE PRECISION NOT NULL,
    "order_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "order_type" TEXT NOT NULL,
    "trade_category" TEXT NOT NULL,
    "buysell_category" TEXT NOT NULL,
    "ioc_category" TEXT NOT NULL,
    "contract_amount" DOUBLE PRECISION NOT NULL,
    "contract_rate" DOUBLE PRECISION NOT NULL,
    "contract_payment" DOUBLE PRECISION NOT NULL,
    "order_commission" DOUBLE PRECISION NOT NULL,
    "leverage_commission" DOUBLE PRECISION NOT NULL,
    "deposit_withdrawal_category" TEXT NOT NULL,
    "deposit_withdrawal_amount" DOUBLE PRECISION NOT NULL,
    "givetake_category" TEXT NOT NULL,
    "givetake_amount" DOUBLE PRECISION NOT NULL,
    "sending_commission" DOUBLE PRECISION NOT NULL,
    "sender" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tradeHistory_order_id_contract_id_position_id_transaction_i_key" ON "tradeHistory"("order_id", "contract_id", "position_id", "transaction_id");
