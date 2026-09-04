/**
 * archivePriceRateHistory.ts 純粋関数のテスト
 *
 * ユニットテスト（具体例）とプロパティベーステスト（fast-check）の両方を含む。
 */

import * as fc from 'fast-check';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calcArchiveThreshold,
  buildS3Key,
  toJsonLines,
  buildSuccessMessage,
} from './archivePriceRateHistory';

// ---------------------------------------------------------------------------
// calcArchiveThreshold
// ---------------------------------------------------------------------------

describe('calcArchiveThreshold', () => {
  // ユニットテスト（具体例）
  describe('ユニットテスト', () => {
    it('通常の日付から6ヶ月前を返す', () => {
      const now = new Date('2024-08-15T12:30:00.000Z');
      const result = calcArchiveThreshold(now);
      expect(result).toEqual(new Date('2024-02-15T12:30:00.000Z'));
    });

    it('年をまたぐ場合（1月→前年7月）', () => {
      const now = new Date('2024-01-10T00:00:00.000Z');
      const result = calcArchiveThreshold(now);
      expect(result).toEqual(new Date('2023-07-10T00:00:00.000Z'));
    });

    it('月末クランプ: 8/31 → 2/29（うるう年2024）', () => {
      const now = new Date('2024-08-31T10:00:00.000Z');
      const result = calcArchiveThreshold(now);
      expect(result).toEqual(new Date('2024-02-29T10:00:00.000Z'));
    });

    it('月末クランプ: 8/31 → 2/28（平年2023）', () => {
      const now = new Date('2023-08-31T10:00:00.000Z');
      const result = calcArchiveThreshold(now);
      expect(result).toEqual(new Date('2023-02-28T10:00:00.000Z'));
    });

    it('月末クランプ: 3/31 → 9/30', () => {
      const now = new Date('2024-03-31T00:00:00.000Z');
      const result = calcArchiveThreshold(now);
      expect(result).toEqual(new Date('2023-09-30T00:00:00.000Z'));
    });

    it('月初（1日）の場合', () => {
      const now = new Date('2024-07-01T00:00:00.000Z');
      const result = calcArchiveThreshold(now);
      expect(result).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('ミリ秒を含む時刻が保持される', () => {
      const now = new Date('2024-09-15T23:59:59.999Z');
      const result = calcArchiveThreshold(now);
      expect(result).toEqual(new Date('2024-03-15T23:59:59.999Z'));
    });
  });

  // プロパティベーステスト
  // Feature: price-rate-history-archive, Property 1: 閾値は常に実行時刻の6ヶ月前である
  describe('プロパティテスト', () => {
    // 実用的な日付範囲（1970-01-01 〜 2999-12-31）に絞る
    // fc.date() はデフォルトで Date の最小値〜最大値を生成するが、
    // 極端な値（西暦-271821年など）では Date.UTC が NaN を返すため制限する
    const practicalDateArb = fc.date({
      min: new Date('1970-01-01T00:00:00.000Z'),
      max: new Date('2999-12-31T23:59:59.999Z'),
      noInvalidDate: true,
    });

    it('Property 1: 閾値は常に実行時刻の6ヶ月前である (Validates: Requirements 1.1)', () => {
      fc.assert(
        fc.property(practicalDateArb, (now) => {
          const threshold = calcArchiveThreshold(now);

          const expectedYear = now.getUTCFullYear();
          const expectedMonthIndex = now.getUTCMonth() - 6;
          const expectedYear2 = expectedYear + Math.floor(expectedMonthIndex / 12);
          const expectedMonth = ((expectedMonthIndex % 12) + 12) % 12;

          // 年・月が6ヶ月前であること
          expect(threshold.getUTCFullYear()).toBe(expectedYear2);
          expect(threshold.getUTCMonth()).toBe(expectedMonth);

          // 時分秒ミリ秒が元と一致すること
          expect(threshold.getUTCHours()).toBe(now.getUTCHours());
          expect(threshold.getUTCMinutes()).toBe(now.getUTCMinutes());
          expect(threshold.getUTCSeconds()).toBe(now.getUTCSeconds());
          expect(threshold.getUTCMilliseconds()).toBe(now.getUTCMilliseconds());

          // 日は元の日付以下（クランプにより末日を超えない）
          expect(threshold.getUTCDate()).toBeLessThanOrEqual(now.getUTCDate());

          // 返り値は threshold より前（過去方向）であること
          expect(threshold.getTime()).toBeLessThan(now.getTime());
        }),
        { numRuns: 100 }
      );
    });
  });
});

// ---------------------------------------------------------------------------
// buildS3Key
// ---------------------------------------------------------------------------

describe('buildS3Key', () => {
  // ユニットテスト（具体例）
  describe('ユニットテスト', () => {
    it('通常の日付でキーを生成する', () => {
      const now = new Date('2024-08-15T12:30:00.000Z');
      expect(buildS3Key(now)).toBe(
        'price-rate-history/2024/08/price-rate-history-2024-08-15.jsonl'
      );
    });

    it('月・日が1桁の場合ゼロ埋めされる', () => {
      const now = new Date('2024-01-05T00:00:00.000Z');
      expect(buildS3Key(now)).toBe(
        'price-rate-history/2024/01/price-rate-history-2024-01-05.jsonl'
      );
    });

    it('12月31日', () => {
      const now = new Date('2023-12-31T23:59:59.999Z');
      expect(buildS3Key(now)).toBe(
        'price-rate-history/2023/12/price-rate-history-2023-12-31.jsonl'
      );
    });
  });

  // プロパティベーステスト
  // Feature: price-rate-history-archive, Property 2: S3 キーは実行日の UTC 値を正確に反映する
  describe('プロパティテスト', () => {
    // 実用的な日付範囲（1970-01-01 〜 2999-12-31）に絞る
    // 年が4桁を超える場合（西暦10000年以降）は正規表現 \d{4} にマッチしないため
    const practicalDateArb = fc.date({
      min: new Date('1970-01-01T00:00:00.000Z'),
      max: new Date('2999-12-31T23:59:59.999Z'),
      noInvalidDate: true,
    });

    it('Property 2: S3 キーは実行日の UTC 値を正確に反映する (Validates: Requirements 2.2)', () => {
      const keyPattern =
        /^price-rate-history\/(\d{4})\/(\d{2})\/price-rate-history-(\d{4})-(\d{2})-(\d{2})\.jsonl$/;

      fc.assert(
        fc.property(practicalDateArb, (now) => {
          const key = buildS3Key(now);

          // フォーマットがパターンに一致すること
          const match = key.match(keyPattern);
          expect(match).not.toBeNull();
          if (!match) return;

          const [, yyyy1, mm1, yyyy2, mm2, dd] = match;

          // YYYY/MM 部分と YYYY-MM-DD 部分が一致すること
          expect(yyyy1).toBe(yyyy2);
          expect(mm1).toBe(mm2);

          // UTC 年・月・日が now と一致すること
          const expectedYYYY = String(now.getUTCFullYear());
          const expectedMM = String(now.getUTCMonth() + 1).padStart(2, '0');
          const expectedDD = String(now.getUTCDate()).padStart(2, '0');

          expect(yyyy1).toBe(expectedYYYY);
          expect(mm1).toBe(expectedMM);
          expect(dd).toBe(expectedDD);
        }),
        { numRuns: 100 }
      );
    });
  });
});

// ---------------------------------------------------------------------------
// toJsonLines
// ---------------------------------------------------------------------------

/** テスト用 Decimal 生成ヘルパー */
function makeDecimal(value: string): Decimal {
  return new Decimal(value);
}

describe('toJsonLines', () => {
  // ユニットテスト（具体例）
  describe('ユニットテスト', () => {
    it('空配列は空文字列を返す', () => {
      expect(toJsonLines([])).toBe('');
    });

    it('1件のレコードを正しく変換する', () => {
      const bidDecimal = makeDecimal('5000000.00');
      const askDecimal = makeDecimal('5001000.00');
      const records = [
        {
          id: 1,
          brand: 'BTC',
          bid_price: bidDecimal,
          ask_price: askDecimal,
          created_time: new Date('2024-01-01T00:00:00.000Z'),
        },
      ];
      const result = toJsonLines(records);
      const parsed = JSON.parse(result);
      expect(parsed.id).toBe(1);
      expect(parsed.brand).toBe('BTC');
      // Decimal.toString() は末尾の不要なゼロを除去して返す
      expect(parsed.bid_price).toBe(bidDecimal.toString());
      expect(parsed.ask_price).toBe(askDecimal.toString());
      expect(parsed.created_time).toBe('2024-01-01T00:00:00.000Z');
    });

    it('2件のレコードで行数が2になる', () => {
      const records = [
        {
          id: 1,
          brand: 'BTC',
          bid_price: makeDecimal('5000000'),
          ask_price: makeDecimal('5001000'),
          created_time: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 2,
          brand: 'ETH',
          bid_price: makeDecimal('300000'),
          ask_price: makeDecimal('300500'),
          created_time: new Date('2024-01-01T01:00:00.000Z'),
        },
      ];
      const result = toJsonLines(records);
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
    });

    it('null フィールドが JSON null として出力される', () => {
      const records = [
        {
          id: 3,
          brand: 'XRP',
          bid_price: null,
          ask_price: null,
          created_time: null,
        },
      ];
      const result = toJsonLines(records);
      const parsed = JSON.parse(result);
      expect(parsed.bid_price).toBeNull();
      expect(parsed.ask_price).toBeNull();
      expect(parsed.created_time).toBeNull();
    });

    it('各行が valid JSON である', () => {
      const records = [
        {
          id: 1,
          brand: 'BTC',
          bid_price: makeDecimal('100'),
          ask_price: makeDecimal('101'),
          created_time: new Date('2024-06-01T00:00:00.000Z'),
        },
        {
          id: 2,
          brand: 'ETH',
          bid_price: null,
          ask_price: null,
          created_time: null,
        },
      ];
      const result = toJsonLines(records);
      for (const line of result.split('\n')) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('末尾に改行がつかない', () => {
      const records = [
        {
          id: 1,
          brand: 'BTC',
          bid_price: makeDecimal('1'),
          ask_price: makeDecimal('2'),
          created_time: new Date('2024-01-01T00:00:00.000Z'),
        },
      ];
      const result = toJsonLines(records);
      expect(result.endsWith('\n')).toBe(false);
    });
  });

  // プロパティベーステスト
  // Feature: price-rate-history-archive, Property 3: JSON Lines シリアライズはすべての列を保持する
  // Feature: price-rate-history-archive, Property 4: 行数は常にレコード数と一致する
  describe('プロパティテスト', () => {
    /** テスト用レコード Arbitrary */
    const recordArb = fc.record({
      id: fc.integer({ min: 1, max: 1_000_000 }),
      brand: fc.stringMatching(/^[A-Z]{2,5}$/),
      bid_price: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 1, max: 100_000_000 }).map((n) => makeDecimal(String(n)))
      ),
      ask_price: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 1, max: 100_000_000 }).map((n) => makeDecimal(String(n)))
      ),
      created_time: fc.oneof(
        fc.constant(null),
        fc.date({ noInvalidDate: true })
      ),
    });

    it('Property 3: JSON Lines シリアライズはすべての列を保持する（ラウンドトリップ）(Validates: Requirements 1.4, 2.1)', () => {
      fc.assert(
        fc.property(fc.array(recordArb, { minLength: 0, maxLength: 50 }), (records) => {
          if (records.length === 0) {
            expect(toJsonLines(records)).toBe('');
            return;
          }

          const result = toJsonLines(records);
          const lines = result.split('\n');

          lines.forEach((line, i) => {
            const parsed = JSON.parse(line);
            const original = records[i];

            // id・brand が一致すること
            expect(parsed.id).toBe(original.id);
            expect(parsed.brand).toBe(original.brand);

            // bid_price: null または文字列に変換されていること
            if (original.bid_price === null) {
              expect(parsed.bid_price).toBeNull();
            } else {
              expect(parsed.bid_price).toBe(original.bid_price.toString());
            }

            // ask_price: null または文字列に変換されていること
            if (original.ask_price === null) {
              expect(parsed.ask_price).toBeNull();
            } else {
              expect(parsed.ask_price).toBe(original.ask_price.toString());
            }

            // created_time: null または ISO 文字列に変換されていること
            if (original.created_time === null) {
              expect(parsed.created_time).toBeNull();
            } else {
              expect(parsed.created_time).toBe(original.created_time.toISOString());
            }
          });
        }),
        { numRuns: 100 }
      );
    });

    it('Property 4: 行数は常にレコード数と一致する (Validates: Requirements 2.1)', () => {
      fc.assert(
        fc.property(fc.array(recordArb, { minLength: 0, maxLength: 100 }), (records) => {
          const result = toJsonLines(records);

          if (records.length === 0) {
            expect(result).toBe('');
            return;
          }

          // 末尾の空行を除いた行数がレコード数と等しいこと
          const lines = result.split('\n').filter((l) => l.length > 0);
          expect(lines.length).toBe(records.length);
        }),
        { numRuns: 100 }
      );
    });
  });
});

// ---------------------------------------------------------------------------
// buildSuccessMessage
// ---------------------------------------------------------------------------

describe('buildSuccessMessage', () => {
  // ユニットテスト（具体例）
  describe('ユニットテスト', () => {
    it('archivedCount・s3Key・deletedCount をすべて含む', () => {
      const result = buildSuccessMessage({
        archivedCount: 1234,
        s3Key: 'price-rate-history/2024/08/price-rate-history-2024-08-01.jsonl',
        deletedCount: 1230,
      });
      expect(result).toContain('1234');
      expect(result).toContain('price-rate-history/2024/08/price-rate-history-2024-08-01.jsonl');
      expect(result).toContain('1230');
    });

    it('0件でも正常に動作する', () => {
      const result = buildSuccessMessage({
        archivedCount: 0,
        s3Key: 'price-rate-history/2024/01/price-rate-history-2024-01-01.jsonl',
        deletedCount: 0,
      });
      expect(result).toContain('0');
      expect(result).toContain('price-rate-history/2024/01/price-rate-history-2024-01-01.jsonl');
    });
  });

  // プロパティベーステスト
  // Feature: price-rate-history-archive, Property 5: 成功メッセージはすべての必須情報を含む
  describe('プロパティテスト', () => {
    it('Property 5: 成功メッセージはすべての必須情報を含む (Validates: Requirements 4.1)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10_000_000 }),
          // S3 キーとして安全な ASCII 文字列を生成（ファイルパス形式）
          fc.stringMatching(/^[a-zA-Z0-9\-_\/\.]+$/).filter((s) => s.length > 0),
          fc.integer({ min: 0, max: 10_000_000 }),
          (archivedCount, s3Key, deletedCount) => {
            const result = buildSuccessMessage({ archivedCount, s3Key, deletedCount });

            // archivedCount の値が含まれること
            expect(result).toContain(String(archivedCount));
            // s3Key が含まれること
            expect(result).toContain(s3Key);
            // deletedCount の値が含まれること
            expect(result).toContain(String(deletedCount));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
