/**
 * ダブルボトム（買い候補）。
 * 2つの安値が近い水準で並び、間の戻り高値（ネックライン）を最終的に上抜ける形を検出する。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type DoubleBottomOptions = {
  minBars: number;
  staleMs: number;
  troughTolerancePct: number;
  breakoutPct: number;
  minBouncePct: number;
};

const defaultOptions: DoubleBottomOptions = {
  minBars: 36,
  staleMs: 3 * 60 * 60 * 1000,
  troughTolerancePct: 1.8,
  breakoutPct: 0.2,
  minBouncePct: 1.2
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

function findTroughIndices(values: number[]): number[] {
  const idxs: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] <= values[i - 1] && values[i] <= values[i + 1]) {
      idxs.push(i);
    }
  }
  return idxs;
}

/**
 * 簡易判定:
 * - 直近2つの谷が同水準（ダブルボトム）
 * - その間に十分な戻り高値（ネックライン）がある
 * - 最新値がネックラインを上抜け、1本前はネックライン未満
 */
export function detectDoubleBottom(bars: PriceBar[], options: Partial<DoubleBottomOptions> = {}): boolean {
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

  const troughs = findTroughIndices(asks);
  if (troughs.length < 2) {
    return false;
  }
  const t1i = troughs[troughs.length - 2];
  const t2i = troughs[troughs.length - 1];
  if (t1i + 2 > t2i - 1) {
    return false;
  }

  const t1 = asks[t1i];
  const t2 = asks[t2i];
  const troughMean = (t1 + t2) / 2;
  const troughDiffPct = troughMean > 0 ? (Math.abs(t1 - t2) / troughMean) * 100 : 100;
  if (troughDiffPct > o.troughTolerancePct) {
    return false;
  }

  // 谷の間のピークをネックライン候補にする
  const peaks = findPeakIndices(asks).filter((i) => i > t1i && i < t2i);
  if (peaks.length === 0) {
    return false;
  }
  const neckline = peaks.reduce((m, i) => Math.max(m, asks[i]), asks[peaks[0]]);

  // 戻り幅が小さすぎるノイズを除外
  const minTrough = Math.min(t1, t2);
  const bouncePct = ((neckline - minTrough) / minTrough) * 100;
  if (bouncePct < o.minBouncePct) {
    return false;
  }

  const prev = asks[asks.length - 2];
  const last = asks[asks.length - 1];
  const breakoutLevel = neckline * (1 + o.breakoutPct / 100);
  return prev < neckline && last >= breakoutLevel;
}

function evaluateDoubleBottom({ bars }: ChartPatternEvaluateInput): boolean {
  return detectDoubleBottom(bars);
}

export const doubleBottomDetector: ChartPatternDetector = {
  id: 'double_bottom',
  titleJa: 'SS - ダブルボトム',
  signal: 'buy',
  evaluate: evaluateDoubleBottom
};
