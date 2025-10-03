import { useState, useEffect } from "react";

type TradeCount = {
  brand: string;
  sell_count: number;
  buy_count: number;
};

export default function TradeCount() {
  const [tradeCountData, setTradeCountData] = useState<TradeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfitData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // APIエンドポイントのURLを指定（環境変数から取得するか、直接指定）
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

        const response = await fetch(`${apiUrl}/data/tradecount`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTradeCountData(
            data.body
              .map(
                (item: {
                  brand: { name: string };
                  sell_count: number;
                  buy_count: number;
                }) => {
                  return {
                    brand: item.brand.name,
                    sell_count: item.sell_count,
                    buy_count: item.buy_count,
                  };
                }
              )
              .sort((item1: TradeCount, item2: TradeCount) =>
                item1.sell_count > item2.sell_count ? -1 : 1
              )
          ); // bodyパラメータの値を取得
        } else {
          setError("データの取得に失敗しました");
        }
      } catch (err) {
        console.error("エラーが発生しました:", err);
        setError("エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfitData();
  }, []);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>エラー: {error}</div>;
  }

  return (
    <>
      {tradeCountData ? (
        <div>
          <table
            style={{
              width: "100%",
              margin: "8px",
              border: "1px solid black",
            }}
          >
            <thead>
              <tr>
                <th style={{ border: "1px solid black" }}>通貨</th>
                <th style={{ border: "1px solid black" }}>売</th>
                <th style={{ border: "1px solid black" }}>買</th>
              </tr>
            </thead>
            <tbody>
              {tradeCountData.map((item) => {
                return (
                  <tr key={item.brand}>
                    <td style={{ border: "1px solid black" }}>{item.brand}</td>
                    <td style={{ border: "1px solid black" }}>
                      {item.sell_count}
                    </td>
                    <td style={{ border: "1px solid black" }}>
                      {item.buy_count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div>データがありません</div>
      )}
    </>
  );
}
