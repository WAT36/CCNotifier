import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as stream from "stream";
import * as util from "util";
import csv from "csv-parser";
import { postWebhook } from "./postWebhook";
import { registerDataByLambda } from "./registerTradeHistory";
import { allRateCheckAndPost } from "./allRateCheckAndPost";
import { routeApiGatewayRequest } from "./apiRouter";

const s3 = new S3Client({ region: process.env.REGION });

export const handler = async (event: any, context: any) => {
  try {
    // API Gatewayからのリクエストかどうかを判定
    if (event.httpMethod && event.path) {
      // API Gatewayからのリクエスト
      return await routeApiGatewayRequest(event);
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
      // どの事業者からのデータかを確認するフラグを設定
      const serviceFlag = objectKey.includes("コインチェック")
        ? "COINCHECK"
        : results[0] && Object.keys(results[0]).length === 23
        ? "GMO"
        : undefined;
      // データを登録する
      const registeredLine = await registerDataByLambda(results, serviceFlag);
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
      await allRateCheckAndPost({ isRegularly: true });

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
