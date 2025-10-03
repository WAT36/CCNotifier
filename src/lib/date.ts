const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * YYYY-MM-DD 形式の文字列をパースして Date 型を返す
 * @param input "2025-07-12" のような文字列
 * @throws Error フォーマット不正 or 存在しない日付
 */
export function parseYyyyMmDd(input: string): Date {
  const m = input.match(RE_DATE);
  if (!m) {
    throw new Error(`Invalid format: expected YYYY-MM-DD, got "${input}"`);
  }

  const [, yearStr, monthStr, dayStr] = m;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // 月は1–12、日は1–31の範囲チェック
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month value: "${monthStr}"`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day value: "${dayStr}"`);
  }

  // Date オブジェクトを生成（ローカルタイム）
  const dt = new Date(year, month - 1, day);

  // 実在日か確認
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    throw new Error(`Invalid date: "${input}"`);
  }

  return dt;
}

/**
 * YYYY-MM-DD 形式の文字列を受け取り、
 * その翌日の日付を Date 型で返す
 * @param input "2025-07-12" のような文字列
 */
export function parseYyyyMmDdNextDay(input: string): Date {
  const dt = parseYyyyMmDd(input);
  dt.setDate(dt.getDate() + 1);
  return dt;
}
