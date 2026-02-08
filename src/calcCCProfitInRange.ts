import { PrismaClient } from '@prisma/client';
import { parseYyyyMmDd, parseYyyyMmDdNextDay } from './lib/date';
import { DEFAULT_START_DATE, DEFAULT_END_DATE, EXCLUDED_BRAND } from './lib/constant';
export const prisma: PrismaClient = new PrismaClient();

type ProfitResult = {
  brand: {
    name: string;
  };
  profit: number | undefined;
};

const defaultStartDate = parseYyyyMmDd(process.argv[2] || DEFAULT_START_DATE);
const defaultEndDate = parseYyyyMmDdNextDay(process.argv[3] || DEFAULT_END_DATE);

// 指定した期間内における仮想通貨取引の利益を算出（銘柄ごとに）する関数
export async function calcCCProfitinRange(startDateInput?: Date, endDateInput?: Date): Promise<ProfitResult[]> {
  const startDate = startDateInput || defaultStartDate;
  const endDate = endDateInput || defaultEndDate;
  const result = [];
  const brands = await prisma.brand.findMany({
    select: {
      name: true
    }
  });

  for (const brand of brands) {
    // JPYだけは対象外
    if (brand.name === EXCLUDED_BRAND) {
      continue;
    }
    // 期間内の一番前と一番後の売却レコードを取得
    const newest_sell_id = await prisma.tradeHistory.aggregate({
      _max: {
        id: true
      },
      where: {
        brand: brand.name,
        buysell_category: '売',
        trade_date: {
          gte: startDate,
          lt: endDate
        }
      }
    });
    // データがない->その期間内ではまだ売却してないので利益なし->nullで返す
    if (!newest_sell_id || !newest_sell_id._max.id) {
      result.push({
        brand,
        profit: undefined
      });
      continue;
    }
    // 期間より前で一番後の売却レコードを取得（それより後の購入データも含めての利益を算出する）
    const old_sell_id = (
      await prisma.tradeHistory.aggregate({
        _max: {
          id: true
        },
        where: {
          brand: brand.name,
          buysell_category: '売',
          trade_date: {
            lt: startDate
          }
        }
      })
    )._max.id;
    // 利益算出
    const profit = await prisma.tradeHistory.groupBy({
      by: ['brand'],
      where: {
        brand: brand.name,
        id: {
          gt: old_sell_id || 0,
          lte: newest_sell_id._max.id
        }
      },
      _sum: {
        yen_payment: true
      }
    });

    const rawProfit = profit[0]?._sum?.yen_payment;
    result.push({
      brand,
      profit: rawProfit !== undefined ? Number(rawProfit) : undefined
    });
  }
  console.log(result);
  console.log(
    '総利益：',
    result.reduce(
      (accumulator, currentValue) =>
        accumulator + (currentValue.profit !== undefined ? Number(currentValue.profit) : 0),
      0
    ),
    '円'
  );
  return result;
}
calcCCProfitinRange();
