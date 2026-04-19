-- CreateTable
CREATE TABLE "sneakerRateHistory" (
    "id" SERIAL NOT NULL,
    "brand" VARCHAR(4) NOT NULL,
    "sneaker_rate" DECIMAL(65,30),
    "created_time" TIMESTAMP(6),

    CONSTRAINT "sneakerRateHistory_pkey" PRIMARY KEY ("id")
);
