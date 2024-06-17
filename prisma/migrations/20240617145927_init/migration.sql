-- CreateTable
CREATE TABLE "balance" (
    "symbol" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "balance_symbol_key" ON "balance"("symbol");
