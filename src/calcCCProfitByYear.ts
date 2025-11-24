import { calcCCProfitinRange, prisma } from "./calcCCProfitInRange";
import { parseYyyyMmDd, parseYyyyMmDdNextDay } from "./lib/date";
import { YEAR_START_DATE_FORMAT, YEAR_END_DATE_FORMAT } from "./lib/constant";

export type YearlyProfitSummary = {
  year: number;
  profit: number;
};

export async function calcCCProfitByYear(): Promise<YearlyProfitSummary[]> {
  // 最初と最後の取引日を取得
  const { _min, _max } = await prisma.tradeHistory.aggregate({
    _min: { trade_date: true },
    _max: { trade_date: true },
  });

  const firstTradeDate = _min.trade_date;
  const lastTradeDate = _max.trade_date;

  if (!firstTradeDate || !lastTradeDate) {
    return [];
  }

  // 最初と最後の年を取得
  const startYear = firstTradeDate.getFullYear();
  const endYear = lastTradeDate.getFullYear();

  // 年ごとに利益を計算
  const yearlySummaries: YearlyProfitSummary[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const rangeStart = parseYyyyMmDd(`${year}-${YEAR_START_DATE_FORMAT}`);
    const rangeEnd = parseYyyyMmDdNextDay(`${year}-${YEAR_END_DATE_FORMAT}`);
    const brandProfits = await calcCCProfitinRange(rangeStart, rangeEnd);

    const profit = brandProfits.reduce((sum, item) => {
      return sum + (item.profit !== undefined ? Number(item.profit) : 0);
    }, 0);

    yearlySummaries.push({
      year,
      profit,
    });
  }

  return yearlySummaries;
}
