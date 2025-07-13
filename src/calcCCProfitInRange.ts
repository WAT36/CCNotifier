import { PrismaClient } from "@prisma/client";
export const prisma: PrismaClient = new PrismaClient();

const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * YYYY-MM-DD 形式の文字列をパースして Date 型を返す
 * @param input "2025-07-12" のような文字列
 * @throws Error フォーマット不正 or 存在しない日付
 */
export function parseYyyyMmDd(input: string): Date {
  const m = input.match(RE_DATE);
  if (!m) {
    throw new Error(`Invalid format: expected YYYY-MM-DD, got "${input}"`);
  }

  const [, yearStr, monthStr, dayStr] = m;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // 月は1–12、日は1–31の範囲チェック
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month value: "${monthStr}"`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day value: "${dayStr}"`);
  }

  // Date オブジェクトを生成（ローカルタイム）
  const dt = new Date(year, month - 1, day);

  // 実在日か確認
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    throw new Error(`Invalid date: "${input}"`);
  }

  return dt;
}

/**
 * YYYY-MM-DD 形式の文字列を受け取り、
 * その翌日の日付を Date 型で返す
 * @param input "2025-07-12" のような文字列
 */
export function parseYyyyMmDdNextDay(input: string): Date {
  const dt = parseYyyyMmDd(input);
  dt.setDate(dt.getDate() + 1);
  return dt;
}

// 引数チェック
if (process.argv.length !== 4) {
  console.error(
    `Error: Usage: npx ts-node ${process.argv[1]} (startDate) (endDate)`
  );
  process.exit(1);
}
//  startDate,endDateがYYYY-MMM-DD形式か確認
const startDate = parseYyyyMmDd(process.argv[2]);
const endDate = parseYyyyMmDdNextDay(process.argv[3]);

// 指定した期間内における仮想通貨取引の利益を算出（銘柄ごとに）する関数
export async function calcCCProfitinRange() {
  const result = [];
  const brands = await prisma.brand.findMany({
    select: {
      name: true,
    },
  });

  for (const brand of brands) {
    // JPYだけは対象外
    if (brand.name === "JPY") {
      continue;
    }
    // 期間内の一番前と一番後の売却レコードを取得
    const newest_sell_id = await prisma.tradeHistory.aggregate({
      _max: {
        id: true,
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
    if (!newest_sell_id || !newest_sell_id._max.id) {
      result.push({
        brand,
        profit: undefined,
      });
      continue;
    }
    // 期間より前で一番後の売却レコードを取得（それより後の購入データも含めての利益を算出する）
    const old_sell_id = (
      await prisma.tradeHistory.aggregate({
        _max: {
          id: true,
        },
        where: {
          brand: brand.name,
          buysell_category: "売",
          trade_date: {
            lt: startDate,
          },
        },
      })
    )._max.id;
    // 利益算出
    const profit = await prisma.tradeHistory.groupBy({
      by: ["brand"],
      where: {
        brand: brand.name,
        id: {
          gt: old_sell_id || 0,
          lte: newest_sell_id._max.id,
        },
      },
      _sum: {
        yen_payment: true,
      },
    });

    result.push({
      brand,
      profit: profit[0]?._sum?.yen_payment || undefined,
    });
  }
  console.log(result);
  console.log(
    "総利益：",
    result.reduce(
      (accumulator, currentValue) =>
        accumulator +
        (currentValue.profit !== undefined ? Number(currentValue.profit) : 0),
      0
    ),
    "円"
  );
  return result;
}
calcCCProfitinRange();
