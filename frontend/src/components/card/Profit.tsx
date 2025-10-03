import { useState, useEffect } from "react";

type Profit = {
  brand: string;
  profit: number;
};

export default function Profit() {
  const [profitData, setProfitData] = useState<Profit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfitData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // APIエンドポイントのURLを指定（環境変数から取得するか、直接指定）
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

        const response = await fetch(`${apiUrl}/data/profit`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfitData(
            data.body
              .map((item: { brand: { name: string }; profit: string }) => {
                return { brand: item.brand.name, profit: +item.profit };
              })
              .sort((item1: Profit, item2: Profit) =>
                item1.profit > item2.profit ? -1 : 1
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
      {profitData ? (
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
                <th style={{ border: "1px solid black" }}>利益</th>
              </tr>
            </thead>
            <tbody>
              {profitData.map((item) => {
                return (
                  <tr key={item.brand}>
                    <td style={{ border: "1px solid black" }}>{item.brand}</td>
                    <td style={{ border: "1px solid black" }}>{item.profit}</td>
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
