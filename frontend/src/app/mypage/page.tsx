"use client";

import RequireAuth from "../RequireAuth";
import { GraphGrid } from "../../components";
import Notice from "@/components/card/Notice";
import ProfitBrand from "@/components/card/ProfitBrand";
import ProfitYearly from "@/components/card/ProfitYearly";
import TradeCount from "@/components/card/TradeCount";
import CsvUpload from "@/components/card/CsvUpload";

export default function MyPage() {
  // 全グラフデータの定義
  const allGraphs = [
    { id: "notice", title: "Slack通知実行ボタン", children: <Notice /> },
    {
      id: "profitBrand",
      title: "通貨毎の利益(全期間)",
      children: <ProfitBrand />,
    },
    {
      id: "tradecount",
      title: "通貨毎の取引回数(全期間)",
      children: <TradeCount />,
    },
    { id: "csvupload", title: "CSVアップロード", children: <CsvUpload /> },
    {
      id: "profitYearly",
      title: "年次利益サマリ",
      children: <ProfitYearly />,
    },
    { id: "graph6", title: "グラフ6" },
  ];

  return (
    <RequireAuth>
      <div style={{ padding: "2rem" }}>
        <h1>マイページ</h1>
        <p>ようこそ、ログイン済みのユーザーさん！</p>

        {/* グラフ表示エリア */}
        <div style={{ marginTop: "2rem" }}>
          {/* 全グラフを表示（1行3つずつ） */}
          <GraphGrid graphs={allGraphs} columnsPerRow={3} />
        </div>
      </div>
    </RequireAuth>
  );
}
