import { useEffect, useState } from "react";

type MonthlyProfit = {
  year: number;
  month: number;
  profit: number;
};

export default function ProfitMonthly() {
  const [monthlyProfit, setMonthlyProfit] = useState<MonthlyProfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlyProfit = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const response = await fetch(`${apiUrl}/data/profit/monthly`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          setError("データの取得に失敗しました");
          return;
        }

        const data = await response.json();
        const parsed: MonthlyProfit[] = (data.body || []).map(
          (item: MonthlyProfit) => ({
            year: item.year,
            month: item.month,
            profit: item.profit,
          })
        );

        setMonthlyProfit(
          parsed.sort((a, b) =>
            a.year * 100 + a.month > b.year * 100 + b.month ? -1 : 1
          ) // 最新年を上に
        );
      } catch (err) {
        console.error("月次利益取得エラー:", err);
        setError("エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyProfit();
  }, []);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>エラー: {error}</div>;
  }

  if (!monthlyProfit.length) {
    return <div>データがありません</div>;
  }

  return (
    <table style={{ width: "100%", margin: "8px", border: "1px solid black" }}>
      <thead>
        <tr>
          <th style={{ border: "1px solid black" }}>年月</th>
          <th style={{ border: "1px solid black" }}>利益合計</th>
        </tr>
      </thead>
      <tbody>
        {monthlyProfit.map((item) => (
          <tr key={`${item.year}-${item.month}`}>
            <td style={{ border: "1px solid black" }}>{`${item.year}/${String(
              item.month
            ).padStart(2, "0")}`}</td>
            <td style={{ border: "1px solid black" }}>{item.profit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
