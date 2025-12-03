import { calcCCProfitinRange } from "./calcCCProfitInRange";
import { parseYyyyMmDd } from "./lib/date";
import { MONTH_START_DAY_FORMAT } from "./lib/constant";

export type MonthlyProfitSummary = {
  year: number;
  month: number;
  profit: number;
};

export async function calcCCProfitByMonth(): Promise<MonthlyProfitSummary[]> {
  // 現在時刻を取得
  const now = new Date();
  // 年と月を取得
  let year = now.getFullYear();
  let month = now.getMonth();

  // 月ごとに利益を計算
  const monthlySummaries: MonthlyProfitSummary[] = [];

  for (let i = 0; i < 12; i++) {
    const nowYear = year;
    const nowMonth = month;
    const rangeStart = parseYyyyMmDd(
      `${nowYear}-${nowMonth}-${MONTH_START_DAY_FORMAT}`
    );
    const rangeEnd = parseYyyyMmDd(
      `${nowMonth < 12 ? nowYear : nowYear + 1}-${
        nowMonth < 12 ? nowMonth + 1 : 1
      }-${MONTH_START_DAY_FORMAT}`
    );
    const brandProfits = await calcCCProfitinRange(rangeStart, rangeEnd);

    const profit = brandProfits.reduce((sum, item) => {
      return sum + (item.profit !== undefined ? Number(item.profit) : 0);
    }, 0);

    monthlySummaries.push({
      year: nowYear,
      month: nowMonth,
      profit,
    });

    if (month == 1) {
      year--;
      month = 12;
    } else {
      month--;
    }
  }

  return monthlySummaries;
}
