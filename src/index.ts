import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as stream from "stream";
import * as util from "util";
import csv from "csv-parser";
import { allCheckSellTime } from "./allCheckSellTime";
import { allUpdateShopRate } from "./allUpdateShopRate";
import { compareDataAndAssets } from "./compareDataAndAssets";
import { postWebhook } from "./postWebhook";
import { registerDataByLambda } from "./registerTradeHistory";

const s3 = new S3Client({ region: process.env.REGION });

export const handler = async (event: any, context: any) => {
  if (event.source === "aws.s3") {
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
  } else {
    // それ以外（定期スケジュール実行）
    // all update rate
    await allUpdateShopRate();

    // assets compare
    const compareResult = await compareDataAndAssets();

    // all check sell time
    const allCheckResult = await allCheckSellTime();

    // send data
    const requestData =
      "--- compare NG ---\n" +
      (compareResult.ng.length === 0
        ? "全て相違なし！\n"
        : compareResult.ng.join("\n")) +
      "---            ---\n" +
      "--- sell check ---\n" +
      allCheckResult.join("\n");
    await postWebhook(requestData);
  }
};
