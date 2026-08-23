import * as dotenv from 'dotenv';
import * as path from 'path';
import { getShopRate } from './getShopRate';
import { prisma } from './lib/prisma';
dotenv.config({ path: path.join(__dirname, '../.env') });

export type ShopRate = {
  id: number;
  bid: number;
  ask: number;
};
type BrandIdMap = { [id: string]: string };

export const allUpdateShopRate = async () => {
  // 銘柄のIDデータ取得
  const brandIdMapData = (await prisma.brandId.findMany()).reduce<BrandIdMap>((accumulator, currentValue) => {
    accumulator[String(currentValue.id.toNumber())] = currentValue.name;
    return accumulator;
  }, {});

  const shopRateData: ShopRate[] = ((await getShopRate()) as any[]).map((x: any) => {
    return {
      id: x.productId,
      bid: x.bid,
      ask: x.ask
    };
  });

  // レート履歴登録。1件ずつtransaction内でcreateすると件数分の往復が発生するため、
  // 一括createManyで1回のINSERTにまとめる（複数件のbulk insertはそれ自体が原子的なのでtransactionも不要）
  const now = new Date();
  const rateHistoryData = shopRateData
    .filter((brandRateData) => brandIdMapData[String(brandRateData.id)])
    .map((brandRateData) => ({
      brand: brandIdMapData[brandRateData.id].toUpperCase(),
      bid_price: brandRateData.bid,
      ask_price: brandRateData.ask,
      created_time: now
    }));

  if (rateHistoryData.length > 0) {
    await prisma.priceRateHistory.createMany({ data: rateHistoryData });
  }
};

// 引数チェック
if (process.argv[1] === __filename) {
  allUpdateShopRate();
}
