import { PrismaClient } from "@prisma/client";
import { parseYyyyMmDd, parseYyyyMmDdNextDay } from "./lib/date";
import {
  DEFAULT_START_DATE,
  DEFAULT_END_DATE,
  EXCLUDED_BRAND,
} from "./lib/constant";
export const prisma: PrismaClient = new PrismaClient();

//  startDate,endDateがYYYY-MMM-DD形式か確認
const startDate = parseYyyyMmDd(process.argv[2] || DEFAULT_START_DATE);
const endDate = parseYyyyMmDdNextDay(process.argv[3] || DEFAULT_END_DATE);

// 指定した期間内における仮想通貨取引の利益を算出（銘柄ごとに）する関数
export async function calcCCTradeCountinRange() {
  const result = [];
  const brands = await prisma.brand.findMany({
    select: {
      name: true,
    },
  });

  for (const brand of brands) {
    // JPYだけは対象外
    if (brand.name === EXCLUDED_BRAND) {
      continue;
    }
    // 期間内の一番前と一番後の売却レコードを取得
    const sell_count = await prisma.tradeHistory.aggregate({
      _count: {
        brand: true,
      },
      where: {
        brand: brand.name,
        buysell_category: "売",
        trade_date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
    // データがない->その期間内ではまだ売却してないので利益なし->nullで返す
    if (!sell_count || !sell_count._count.brand) {
      result.push({
        brand,
        profit: undefined,
      });
      continue;
    }
    // 期間より前で一番後の売却レコードを取得（それより後の購入データも含めての利益を算出する）
    const buy_count = await prisma.tradeHistory.aggregate({
      _count: {
        brand: true,
      },
      where: {
        brand: brand.name,
        buysell_category: "買",
        trade_date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    result.push({
      brand,
      sell_count: sell_count?._count?.brand || 0,
      buy_count: buy_count?._count?.brand || 0,
    });
  }
  console.log(result);
  return result;
}
calcCCTradeCountinRange();
