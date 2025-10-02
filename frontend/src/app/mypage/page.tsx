"use client";

import RequireAuth from "../RequireAuth";
import { GraphGrid } from "../../components";

export default function MyPage() {
  // 全グラフデータの定義
  const allGraphs = [
    { id: "graph1", title: "グラフ1" },
    { id: "graph2", title: "グラフ2" },
    { id: "graph3", title: "グラフ3" },
    { id: "graph4", title: "グラフ4" },
    { id: "graph5", title: "グラフ5" },
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
