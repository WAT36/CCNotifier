import { allRateCheckAndPost } from "./allRateCheckAndPost";
import { calcCCProfitinRange } from "./calcCCProfitInRange";
import { calcCCTradeCountinRange } from "./calcCCTradeCountInRange";
import { uploadCsvToS3 } from "./csvUpload";

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const jsonResponse = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: defaultHeaders,
  isBase64Encoded: false,
});

export const routeApiGatewayRequest = async (event: any) => {
  const path: string = event.path;
  const method: string = event.httpMethod;

  if (path === "/notice" && method === "GET") {
    await allRateCheckAndPost({ isRegularly: false });
    return jsonResponse(200, {
      message: "Rate check completed successfully",
    });
  }

  if (path.startsWith("/data") && method === "GET") {
    let body;

    if (path.startsWith("/data/profit/brand")) {
      body = await calcCCProfitinRange();
    } else if (path.startsWith("/data/tradecount")) {
      body = await calcCCTradeCountinRange();
    }

    return jsonResponse(200, {
      message: "Data endpoint accessed",
      path: "/data",
      method: "GET",
      body,
    });
  }

  if (path === "/upload/csv" && method === "POST") {
    try {
      if (!event.body) {
        return jsonResponse(400, {
          message: "ファイルデータが提供されていません",
        });
      }

      const requestBody = JSON.parse(event.body);
      const { fileData, fileName } = requestBody;

      if (!fileData || !fileName) {
        return jsonResponse(400, {
          message: "ファイルデータまたはファイル名が提供されていません",
        });
      }

      const fileBuffer = Buffer.from(fileData, "base64");
      const uploadResult = await uploadCsvToS3(fileBuffer, fileName);

      if (uploadResult.success) {
        return jsonResponse(200, {
          message: uploadResult.message,
          fileName: uploadResult.fileName,
          success: true,
        });
      }

      return jsonResponse(500, {
        message: uploadResult.message,
        success: false,
      });
    } catch (error) {
      console.error("CSVアップロード処理エラー:", error);
      return jsonResponse(500, {
        message: `アップロード処理中にエラーが発生しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
        success: false,
      });
    }
  }

  if (path === "/health" && method === "GET") {
    return jsonResponse(200, {
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  }

  return jsonResponse(404, {
    message: "Not Found",
    path,
    method,
  });
};
