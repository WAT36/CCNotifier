"use client";

import { useState, useRef, useCallback } from "react";

interface CsvUploadProps {
  apiBaseUrl?: string;
}

export default function CsvUpload({
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
}: CsvUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルアップロード処理（直接API呼び出し）
  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setErrorMessage("CSVファイルのみアップロード可能です");
        setUploadStatus("error");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus("idle");
      setErrorMessage("");

      try {
        // ファイルをArrayBufferに変換
        setUploadProgress(10);
        const arrayBuffer = await file.arrayBuffer();
        const base64String = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );
        setUploadProgress(30);

        // APIにファイルをアップロード
        const response = await fetch(`${apiBaseUrl}/upload/csv`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileData: base64String,
            fileName: file.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`アップロードに失敗しました: ${response.status}`);
        }

        const result = await response.json();
        setUploadProgress(100);

        if (result.success) {
          setUploadStatus("success");
          console.log(
            `ファイルが正常にアップロードされました: ${result.fileName}`
          );
        } else {
          throw new Error(result.message || "アップロードに失敗しました");
        }
      } catch (error) {
        console.error("アップロードエラー:", error);
        setErrorMessage(
          `アップロードに失敗しました: ${
            error instanceof Error ? error.message : "不明なエラー"
          }`
        );
        setUploadStatus("error");
      } finally {
        setIsUploading(false);
      }
    },
    [apiBaseUrl]
  );

  // ドラッグ&ドロップイベントハンドラー
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [uploadFile]
  );

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [uploadFile]
  );

  // ファイル選択ダイアログを開く
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        padding: "1rem",
      }}
    >
      {/* ドラッグ&ドロップエリア */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        style={{
          width: "100%",
          height: "200px",
          border: `2px dashed ${isDragOver ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDragOver ? "#eff6ff" : "#f9fafb",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📁</div>
        <p
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "0.5rem",
          }}
        >
          CSVファイルをドラッグ&ドロップ
        </p>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          またはクリックしてファイルを選択
        </p>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* アップロード状態表示 */}
      {isUploading && (
        <div style={{ marginTop: "1rem", width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "14px" }}>アップロード中...</span>
            <span style={{ fontSize: "14px" }}>{uploadProgress}%</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: "100%",
                backgroundColor: "#3b82f6",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* 成功メッセージ */}
      {uploadStatus === "success" && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#dcfce7",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            color: "#166534",
            fontSize: "14px",
            width: "100%",
            textAlign: "center",
          }}
        >
          ✅ ファイルが正常にアップロードされました
        </div>
      )}

      {/* エラーメッセージ */}
      {uploadStatus === "error" && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#dc2626",
            fontSize: "14px",
            width: "100%",
            textAlign: "center",
          }}
        >
          ❌ {errorMessage}
        </div>
      )}

      {/* リセットボタン */}
      {(uploadStatus === "success" || uploadStatus === "error") && (
        <button
          onClick={() => {
            setUploadStatus("idle");
            setErrorMessage("");
            setUploadProgress(0);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          リセット
        </button>
      )}
    </div>
  );
}
