/**
 * 三尊（ヘッド＆ショルダートップ）（売り候補）。
 * 左肩・頭・右肩の3高値を形成し、
 * ネックライン（左谷・右谷の水平ライン）を下抜ける形を検出する。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type HeadAndShouldersOptions = {
  minBars: number;
  staleMs: number;
  /** 左右肩の高さ許容差（%） */
  shoulderTolerancePct: number;
  /** 頭が肩平均より何%以上高い必要があるか */
  headMinPct: number;
  /** ネックライン2谷の水準許容差（%） */
  necklineTolerancePct: number;
  /** ネックライン下抜け判定の余裕（%） */
  breakdownPct: number;
};

const defaultOptions: HeadAndShouldersOptions = {
  minBars: 36,
  staleMs: 3 * 60 * 60 * 1000,
  shoulderTolerancePct: 3.0,
  headMinPct: 1.5,
  necklineTolerancePct: 2.0,
  breakdownPct: 0.2
};

function findPeakIndices(values: number[]): number[] {
  const idxs: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] >= values[i - 1] && values[i] >= values[i + 1]) {
      idxs.push(i);
    }
  }
  return idxs;
}

function minInRange(values: number[], from: number, to: number): number {
  let m = values[from];
  for (let i = from + 1; i <= to; i++) {
    m = Math.min(m, values[i]);
  }
  return m;
}

/**
 * 判定ルール:
 * - 直近3高値: 中央（頭）が最大、左右（肩）がほぼ同水準
 * - 頭が肩平均より headMinPct% 以上高い
 * - 左肩〜頭の谷・頭〜右肩の谷がほぼ同水準（水平ネックライン）
 * - 最新値がネックラインを下抜け、1本前はネックライン以上
 */
export function detectHeadAndShoulders(
  bars: PriceBar[],
  options: Partial<HeadAndShouldersOptions> = {}
): boolean {
  const o = { ...defaultOptions, ...options };
  if (bars.length < o.minBars) {
    return false;
  }

  const lastBar = bars[bars.length - 1];
  if (Date.now() - lastBar.time.getTime() > o.staleMs) {
    return false;
  }

  const asks = bars.map((b) => b.ask);
  if (asks.some((x) => !Number.isFinite(x) || x <= 0)) {
    return false;
  }

  const peaks = findPeakIndices(asks);
  if (peaks.length < 3) {
    return false;
  }

  // 直近3高値インデックス（左肩・頭・右肩）
  const leftIdx = peaks[peaks.length - 3];
  const headIdx = peaks[peaks.length - 2];
  const rightIdx = peaks[peaks.length - 1];

  const left = asks[leftIdx];
  const head = asks[headIdx];
  const right = asks[rightIdx];

  // 頭が左右肩より高い（headMinPct% 以上）
  const shoulderMean = (left + right) / 2;
  const headAbovePct = shoulderMean > 0 ? ((head - shoulderMean) / shoulderMean) * 100 : 0;
  if (headAbovePct < o.headMinPct) {
    return false;
  }

  // 左右肩がほぼ同水準
  const shoulderDiffRatio = shoulderMean > 0 ? Math.abs(left - right) / shoulderMean : 1;
  if (shoulderDiffRatio > o.shoulderTolerancePct / 100) {
    return false;
  }

  // 左谷（左肩〜頭の間）・右谷（頭〜右肩の間）の最安値
  const leftTrough = minInRange(asks, leftIdx, headIdx);
  const rightTrough = minInRange(asks, headIdx, rightIdx);

  // ネックライン = 2谷の平均
  const neckline = (leftTrough + rightTrough) / 2;

  // 2谷がほぼ同水準（水平ネックライン）
  const necklineDiffRatio = neckline > 0 ? Math.abs(leftTrough - rightTrough) / neckline : 1;
  if (necklineDiffRatio > o.necklineTolerancePct / 100) {
    return false;
  }

  // 直近でネックラインを下抜け
  const prev = asks[asks.length - 2];
  const last = asks[asks.length - 1];
  const breakdownLevel = neckline * (1 - o.breakdownPct / 100);
  return prev >= neckline && last <= breakdownLevel;
}

function evaluateHeadAndShoulders({ bars }: ChartPatternEvaluateInput): boolean {
  return detectHeadAndShoulders(bars);
}

export const headAndShouldersDetector: ChartPatternDetector = {
  id: 'head_and_shoulders',
  titleJa: 'SS - 三尊',
  signal: 'sell',
  evaluate: evaluateHeadAndShoulders
};
