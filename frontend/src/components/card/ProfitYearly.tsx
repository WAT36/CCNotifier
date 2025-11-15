import { useEffect, useState } from "react";

type YearlyProfit = {
  year: number;
  profit: number;
};

export default function ProfitYearly() {
  const [yearlyProfit, setYearlyProfit] = useState<YearlyProfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYearlyProfit = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const response = await fetch(`${apiUrl}/data/profit/yearly`, {
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
        const parsed: YearlyProfit[] = (data.body || []).map(
          (item: YearlyProfit) => ({
            year: item.year,
            profit: item.profit,
          })
        );

        setYearlyProfit(
          parsed.sort((a, b) => (a.year > b.year ? -1 : 1)) // 最新年を上に
        );
      } catch (err) {
        console.error("年次利益取得エラー:", err);
        setError("エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchYearlyProfit();
  }, []);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>エラー: {error}</div>;
  }

  if (!yearlyProfit.length) {
    return <div>データがありません</div>;
  }

  return (
    <table style={{ width: "100%", margin: "8px", border: "1px solid black" }}>
      <thead>
        <tr>
          <th style={{ border: "1px solid black" }}>年</th>
          <th style={{ border: "1px solid black" }}>利益合計</th>
        </tr>
      </thead>
      <tbody>
        {yearlyProfit.map((item) => (
          <tr key={item.year}>
            <td style={{ border: "1px solid black" }}>{item.year}</td>
            <td style={{ border: "1px solid black" }}>{item.profit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
