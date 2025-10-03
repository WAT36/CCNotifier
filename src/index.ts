import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as stream from "stream";
import * as util from "util";
import csv from "csv-parser";
import { postWebhook } from "./postWebhook";
import { registerDataByLambda } from "./registerTradeHistory";
import { allRateCheckAndPost } from "./allRateCheckAndPost";
import { calcCCProfitinRange } from "./calcCCProfitInRange";
import { calcCCTradeCountinRange } from "./calcCCTradeCountInRange";
import { uploadCsvToS3 } from "./csvUpload";

const s3 = new S3Client({ region: process.env.REGION });

export const handler = async (event: any, context: any) => {
  try {
    // API Gatewayからのリクエストかどうかを判定
    if (event.httpMethod && event.path) {
      // API Gatewayからのリクエスト
      const path = event.path;
      const method = event.httpMethod;

      // ルーティング処理
      if (path === "/notice" && method === "GET") {
        // /noticeエンドポイントの場合
        await allRateCheckAndPost();

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Rate check completed successfully",
          }),
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          isBase64Encoded: false,
        };
      } else if (path.startsWith("/data") && method === "GET") {
        // /dataエンドポイントかつGETメソッドの場合
        let body;

        // 利益取得
        if (path.startsWith("/data/profit") && method === "GET") {
          body = await calcCCProfitinRange();
        } else if (path.startsWith("/data/tradecount") && method === "GET") {
          body = await calcCCTradeCountinRange();
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Data endpoint accessed",
            path: "/data",
            method: "GET",
            body,
          }),
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          isBase64Encoded: false,
        };
      } else if (path === "/upload/csv" && method === "POST") {
        // CSVファイルアップロードエンドポイント
        try {
          // リクエストボディからファイルデータを取得
          if (!event.body) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                message: "ファイルデータが提供されていません",
              }),
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              isBase64Encoded: false,
            };
          }

          // リクエストボディをパース（JSON形式でファイルデータとファイル名を受け取る）
          const requestBody = JSON.parse(event.body);
          const { fileData, fileName } = requestBody;

          if (!fileData || !fileName) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                message: "ファイルデータまたはファイル名が提供されていません",
              }),
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              isBase64Encoded: false,
            };
          }

          // Base64エンコードされたファイルデータをデコード
          const fileBuffer = Buffer.from(fileData, "base64");

          // CSVファイルをS3にアップロード
          const uploadResult = await uploadCsvToS3(fileBuffer, fileName);

          if (uploadResult.success) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: uploadResult.message,
                fileName: uploadResult.fileName,
                success: true,
              }),
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              isBase64Encoded: false,
            };
          } else {
            return {
              statusCode: 500,
              body: JSON.stringify({
                message: uploadResult.message,
                success: false,
              }),
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              isBase64Encoded: false,
            };
          }
        } catch (error) {
          console.error("CSVアップロード処理エラー:", error);
          return {
            statusCode: 500,
            body: JSON.stringify({
              message: `アップロード処理中にエラーが発生しました: ${
                error instanceof Error ? error.message : "不明なエラー"
              }`,
              success: false,
            }),
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            isBase64Encoded: false,
          };
        }
      } else if (path === "/health" && method === "GET") {
        // ヘルスチェックエンドポイントの例
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
          }),
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          isBase64Encoded: false,
        };
      } else {
        // その他のパスまたはメソッドの場合
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Not Found",
            path: path,
            method: method,
          }),
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          isBase64Encoded: false,
        };
      }
    } else if (event.source === "aws.s3") {
      // S3 アップロードイベントの時
      const s3Event = event.detail;
      const bucketName = s3Event.bucket.name;
      const objectKey = decodeURIComponent(
        s3Event.object.key.replace(/\+/g, " ")
      );

      // S3からファイルを取得
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });
      const response = await s3.send(command);

      if (!response.Body) {
        throw new Error("File body is empty");
      }

      const pipeline = util.promisify(stream.pipeline);
      const results: any[] = [];

      // CSVファイルの処理
      await pipeline(
        response.Body as stream.Readable,
        csv(),
        new stream.Writable({
          objectMode: true,
          write: (chunk, _, callback) => {
            results.push(chunk);
            callback();
          },
        })
      );

      const registeredLine = await registerDataByLambda(results);
      await postWebhook(`${registeredLine} 個のデータを登録しました。`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "CSV processing completed",
          registeredCount: registeredLine,
        }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        isBase64Encoded: false,
      };
    } else {
      // EventBridgeからの定期スケジュール実行
      await allRateCheckAndPost();

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Scheduled rate check completed",
        }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        isBase64Encoded: false,
      };
    }
  } catch (e: any) {
    console.error(e);
    return {
      statusCode: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "upstream error",
        detail: String(e?.message ?? e),
      }),
    };
  }
};
