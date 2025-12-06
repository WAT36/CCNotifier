-- CreateTable
CREATE TABLE "rateHistory" (
    "brand" VARCHAR(4) NOT NULL,
    "bid_price" DECIMAL(65,30),
    "ask_price" DECIMAL(65,30),
    "created_time" TIMESTAMP(6),

    CONSTRAINT "rateHistory_pkey" PRIMARY KEY ("brand")
);
