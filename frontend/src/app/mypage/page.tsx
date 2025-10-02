"use client";

import RequireAuth from "../RequireAuth";
import { GraphGrid } from "../../components";

export default function MyPage() {
  // グラフデータの定義
  const firstRowGraphs = [
    { id: "graph1", title: "グラフ1" },
    { id: "graph2", title: "グラフ2" },
    { id: "graph3", title: "グラフ3" },
  ];

  const secondRowGraphs = [
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
          {/* 1行目のグラフ */}
          <GraphGrid graphs={firstRowGraphs} />

          {/* 2行目のグラフ */}
          <GraphGrid graphs={secondRowGraphs} />
        </div>
      </div>
    </RequireAuth>
  );
}
