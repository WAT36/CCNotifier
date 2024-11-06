-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "buysell" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "payment" DOUBLE PRECISION NOT NULL,
    "transaction_date" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_brand_key" ON "transaction"("brand");
