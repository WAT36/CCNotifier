"use client";

import RequireAuth from "../RequireAuth";

export default function MyPage() {
  return (
    <RequireAuth>
      <div style={{ padding: "2rem" }}>
        <h1>マイページ</h1>
        <p>ようこそ、ログイン済みのユーザーさん！</p>
      </div>
    </RequireAuth>
  );
}
