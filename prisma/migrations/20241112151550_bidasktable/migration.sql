-- CreateTable
CREATE TABLE "brandBidAsk" (
    "brand" VARCHAR(3) NOT NULL,
    "bid_price" DOUBLE PRECISION NOT NULL,
    "ask_price" DOUBLE PRECISION NOT NULL,
    "bid_updated_time" TIMESTAMP(6) NOT NULL,
    "ask_updated_time" TIMESTAMP(6) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "brandBidAsk_brand_key" ON "brandBidAsk"("brand");
