/**
 * archivePriceRateHistory.ts
 *
 * priceRateHistory テーブルの古いレートデータを S3（JSON Lines 形式）に
 * アーカイブし DB から削除する月次バッチ処理。
 *
 * 後続タスクで buildS3Key / toJsonLines / buildSuccessMessage /
 * archivePriceRateHistory が順次追加される。
 */

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
