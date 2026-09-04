/**
 * archivePriceRateHistory.ts
 *
 * priceRateHistory テーブルの古いレートデータを S3（JSON Lines 形式）に
 * アーカイブし DB から削除する月次バッチ処理。
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from './lib/prisma';
import { postWebhook } from './postWebhook';

dotenv.config({ path: path.join(__dirname, '../.env') });

/** アーカイブ対象レコードの型定義 */
type PriceRateHistoryRecord = {
  id: number;
  brand: string;
  bid_price: Decimal | null;
  ask_price: Decimal | null;
  created_time: Date | null;
};

/**
 * 実行時刻から Archive_Threshold を計算する純粋関数。
 *
 * `now` から正確に6ヶ月前の Date を返す。
 * 月末オーバーフロー対策として、6ヶ月前の月の末日を超える場合は
 * その月の末日にクランプする（例: 8/31 → 2/28 または 2/29）。
 *
 * Validates: Requirements 1.1
 */
export function calcArchiveThreshold(now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed

  // 6ヶ月前の年月を計算
  const targetMonth = month - 6;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12; // 負数を正規化

  // 6ヶ月前の月の末日を取得（day=0 で前月末日になる）
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0)
  ).getUTCDate();

  // 元の日付が6ヶ月前の月の末日を超える場合はクランプ
  const targetDay = Math.min(now.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      targetDay,
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    )
  );
}

/**
 * 実行時刻から S3 キーを生成する純粋関数。
 *
 * `now` の UTC 年月日を使用して以下の形式のキーを返す:
 * `price-rate-history/YYYY/MM/price-rate-history-YYYY-MM-DD.jsonl`
 *
 * 月・日はゼロ埋め2桁で表現する（例: 01, 09）。
 *
 * Validates: Requirements 2.2
 */
export function buildS3Key(now: Date): string {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');

  return `price-rate-history/${yyyy}/${mm}/price-rate-history-${yyyy}-${mm}-${dd}.jsonl`;
}

/**
 * レコード配列を JSON Lines 文字列に変換する純粋関数。
 *
 * - 各レコードを JSON 文字列に変換して `\n` で結合する
 * - `Decimal` 型は `toString()` で文字列化する
 * - `null` フィールドはそのまま JSON の `null` として出力する
 * - 末尾に改行を付けない
 *
 * Validates: Requirements 1.4, 2.1
 */
export function toJsonLines(records: PriceRateHistoryRecord[]): string {
  return records
    .map((record) => {
      const obj = {
        id: record.id,
        brand: record.brand,
        bid_price: record.bid_price != null ? record.bid_price.toString() : null,
        ask_price: record.ask_price != null ? record.ask_price.toString() : null,
        created_time:
          record.created_time != null ? record.created_time.toISOString() : null,
      };
      return JSON.stringify(obj);
    })
    .join('\n');
}

/**
 * 正常完了時の Slack 通知メッセージを生成する純粋関数。
 *
 * アーカイブ件数・保存先 S3 キー・削除件数をすべて含む文字列を返す。
 *
 * Validates: Requirements 4.1
 */
export function buildSuccessMessage(params: {
  archivedCount: number;
  s3Key: string;
  deletedCount: number;
}): string {
  const { archivedCount, s3Key, deletedCount } = params;
  return (
    `[アーカイブ完了] ${archivedCount}件を S3 に保存しました。\n` +
    `保存先: ${s3Key}\n` +
    `DB から ${deletedCount}件を削除しました。`
  );
}

/**
 * priceRateHistory テーブルの古いレートデータを S3 にアーカイブし DB から削除するバッチ処理。
 *
 * 処理フロー:
 * 1. 実行時刻から Archive_Threshold（6ヶ月前）を計算
 * 2. Prisma で created_time < threshold のレコードを抽出
 * 3. 0件の場合は「対象データなし」を Slack 通知して正常終了
 * 4. 1件以上の場合は JSON Lines に変換して S3 に PutObject
 * 5. S3 失敗時は DB 削除を実行せずエラーを Slack 通知して throw
 * 6. S3 成功後、同一条件で DB からレコードを deleteMany
 * 7. DB 削除失敗時はエラーを Slack 通知して throw（S3 ファイルは削除しない）
 * 8. 正常完了時は buildSuccessMessage のメッセージを Slack 通知
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3
 */
export async function archivePriceRateHistory(): Promise<void> {
  const now = new Date();

  // 1. アーカイブ閾値を計算（実行時刻の6ヶ月前）
  const threshold = calcArchiveThreshold(now);
  console.log(`[archivePriceRateHistory] threshold: ${threshold.toISOString()}`);

  // 2. アーカイブ対象レコードを抽出
  const records = await prisma.priceRateHistory.findMany({
    where: { created_time: { lt: threshold } },
    orderBy: { id: 'asc' },
  });
  console.log(`[archivePriceRateHistory] 対象レコード数: ${records.length}`);

  // 3. 0件の場合は通知して正常終了
  if (records.length === 0) {
    try {
      await postWebhook('[アーカイブ] 対象データなし。6ヶ月以上前のレコードは存在しませんでした。');
    } catch (notifyErr) {
      // Slack 通知失敗はベストエフォート
      console.error('[archivePriceRateHistory] Slack 通知失敗（対象なし）:', notifyErr);
    }
    return;
  }

  // S3 クライアントとバケット名の準備
  const s3 = new S3Client({ region: process.env.REGION });
  const bucketName = process.env.ARCHIVE_BUCKET_NAME ?? '';
  const s3Key = buildS3Key(now);
  const body = toJsonLines(records);

  // 4. S3 に JSON Lines 形式でアップロード（Content-Type: application/x-ndjson）
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: body,
      ContentType: 'application/x-ndjson',
    });
    await s3.send(command);
    console.log(`[archivePriceRateHistory] S3 アップロード完了: s3://${bucketName}/${s3Key}`);
  } catch (s3Err) {
    // 5. S3 失敗時は DB 削除を実行せずエラーを通知して throw
    try {
      await postWebhook(`[アーカイブエラー] S3 アップロードに失敗しました。DB 削除は実行されていません。\n詳細: ${String(s3Err)}`);
    } catch (notifyErr) {
      // Slack 通知失敗はベストエフォート
      console.error('[archivePriceRateHistory] Slack 通知失敗（S3 エラー）:', notifyErr);
    }
    throw s3Err;
  }

  // 6. S3 アップロード確認後、同一条件で DB から削除
  let deletedCount: number;
  try {
    const deleteResult = await prisma.priceRateHistory.deleteMany({
      where: { created_time: { lt: threshold } },
    });
    deletedCount = deleteResult.count;
    console.log(`[archivePriceRateHistory] DB 削除完了: ${deletedCount}件`);
  } catch (dbErr) {
    // 7. DB 削除失敗時はエラーを通知して throw（S3 ファイルは削除しない）
    try {
      await postWebhook(`[アーカイブエラー] DB 削除に失敗しました。S3 のアーカイブファイルは保持されています。\n保存先: ${s3Key}\n詳細: ${String(dbErr)}`);
    } catch (notifyErr) {
      // Slack 通知失敗はベストエフォート
      console.error('[archivePriceRateHistory] Slack 通知失敗（DB 削除エラー）:', notifyErr);
    }
    throw dbErr;
  }

  // 8. 正常完了通知
  const message = buildSuccessMessage({
    archivedCount: records.length,
    s3Key,
    deletedCount,
  });
  try {
    await postWebhook(message);
  } catch (notifyErr) {
    // Slack 通知失敗はベストエフォート
    console.error('[archivePriceRateHistory] Slack 通知失敗（完了通知）:', notifyErr);
  }
}
