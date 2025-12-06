import * as dotenv from "dotenv";
import * as path from "path";
import { getShopRate } from "./getShopRate";
import { PrismaClient } from "@prisma/client";
export const prisma: PrismaClient = new PrismaClient();
dotenv.config({ path: path.join(__dirname, "../.env") });

export type ShopRate = {
  id: number;
  bid: number;
  ask: number;
};
type BrandIdMap = { [id: string]: string };

export const allUpdateShopRate = async () => {
  // 銘柄のIDデータ取得
  const brandIdMapData = (await prisma.brandId.findMany()).reduce<BrandIdMap>(
    (accumulator, currentValue) => {
      accumulator[String(currentValue.id.toNumber())] = currentValue.name;
      return accumulator;
    },
    {}
  );

  const shopRateData: ShopRate[] = ((await getShopRate()) as any[]).map(
    (x: any) => {
      return {
        id: x.productId,
        bid: x.bid,
        ask: x.ask,
      };
    }
  );

  await prisma.$transaction(async (prisma) => {
    for (const brandRateData of shopRateData) {
      // 更新
      if (brandIdMapData[String(brandRateData.id)]) {
        await prisma.brandBidAsk.upsert({
          where: {
            brand: brandIdMapData[String(brandRateData.id)].toUpperCase() || "",
          },
          update: {
            bid_price: brandRateData.bid,
            ask_price: brandRateData.ask,
            bid_updated_time: new Date(),
            ask_updated_time: new Date(),
          },
          create: {
            brand: brandIdMapData[brandRateData.id].toUpperCase(),
            bid_price: brandRateData.bid,
            ask_price: brandRateData.ask,
            bid_updated_time: new Date(),
            ask_updated_time: new Date(),
          },
        });

        // レート履歴登録
        await prisma.priceRateHistory.create({
          data: {
            brand: brandIdMapData[brandRateData.id].toUpperCase(),
            bid_price: brandRateData.bid,
            ask_price: brandRateData.ask,
            created_time: new Date(),
          },
        });
      }
    }
  });
};

// 引数チェック
if (process.argv[1] === __filename) {
  allUpdateShopRate();
}
