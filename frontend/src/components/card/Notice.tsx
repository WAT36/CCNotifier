import { useState } from "react";

export default function Notice() {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSlackNotification = async () => {
    setIsLoading(true);
    try {
      // APIエンドポイントのURLを指定（環境変数から取得するか、直接指定）
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

      const response = await fetch(`${apiUrl}/notice`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("Slack通知が送信されました");
        // 成功時の処理（必要に応じてトースト通知など）
      } else {
        console.error("Slack通知の送信に失敗しました");
        // エラー時の処理
      }
    } catch (error) {
      console.error("エラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSlackNotification}
        disabled={isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          borderRadius: "50%",
          lineHeight: "100px",
          width: "100px",
          height: "100px",
          padding: "4px",
          boxShadow: isHovered ? "0 2px 0 #36C5F0" : "0 5px 0 #36C5F0",
          transform: isHovered ? "translate(0,3px)" : "translate(0,0)",
          backgroundColor: isLoading ? "#ccc" : "#4A154B",
          border: "none",
          color: "white",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          fontWeight: "bold",
        }}
      >
        {isLoading ? (
          "送信中..."
        ) : (
          <span>
            Slack通知
            <br />
            ボタン
          </span>
        )}
      </button>
    </>
  );
}
