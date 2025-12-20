-- CreateTable
CREATE TABLE "tradeHistoryCoinCheck" (
    "id" SERIAL NOT NULL,
    "trade_date" TIMESTAMP(6) NOT NULL,
    "trade_type" TEXT NOT NULL,
    "trade_method" TEXT NOT NULL,
    "currency_pair" TEXT NOT NULL,
    "increase_currency" TEXT NOT NULL,
    "increase_amount" DECIMAL(65,30) NOT NULL,
    "decrease_currency" TEXT NOT NULL,
    "decrease_amount" DECIMAL(65,30) NOT NULL,
    "executed_value" DECIMAL(65,30) NOT NULL,
    "executed_price" DECIMAL(65,30) NOT NULL,
    "fee_currency" TEXT NOT NULL,
    "fee_amount" DECIMAL(65,30) NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,

    CONSTRAINT "tradeHistoryCoinCheck_pkey" PRIMARY KEY ("id")
);
