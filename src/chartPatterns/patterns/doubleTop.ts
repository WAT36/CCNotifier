/**
 * ダブルトップ（売り候補）。
 * 2つの高値が近い水準で並び、間の押し安値（ネックライン）を最終的に下抜ける形を検出する。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type DoubleTopOptions = {
  minBars: number;
  staleMs: number;
  peakTolerancePct: number;
  breakdownPct: number;
  minDropPct: number;
};

const defaultOptions: DoubleTopOptions = {
  minBars: 36,
  staleMs: 3 * 60 * 60 * 1000,
  peakTolerancePct: 1.8,
  breakdownPct: 0.2,
  minDropPct: 1.2
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
 * - 直近2つの高値が同水準（ダブルトップ）
 * - その間に十分な押し安値（ネックライン）がある
 * - 最新値がネックラインを下抜け、1本前はネックライン以上
 */
export function detectDoubleTop(bars: PriceBar[], options: Partial<DoubleTopOptions> = {}): boolean {
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
  if (peaks.length < 2) {
    return false;
  }
  const p1i = peaks[peaks.length - 2];
  const p2i = peaks[peaks.length - 1];
  if (p1i + 2 > p2i - 1) {
    return false;
  }

  const p1 = asks[p1i];
  const p2 = asks[p2i];
  const peakMean = (p1 + p2) / 2;
  const peakDiffPct = peakMean > 0 ? (Math.abs(p1 - p2) / peakMean) * 100 : 100;
  if (peakDiffPct > o.peakTolerancePct) {
    return false;
  }

  // 高値の間のトラフをネックライン候補にする
  const troughs = findTroughIndices(asks).filter((i) => i > p1i && i < p2i);
  if (troughs.length === 0) {
    return false;
  }
  const neckline = troughs.reduce((m, i) => Math.min(m, asks[i]), asks[troughs[0]]);

  // 押し幅が小さすぎるノイズを除外
  const maxPeak = Math.max(p1, p2);
  const dropPct = ((maxPeak - neckline) / maxPeak) * 100;
  if (dropPct < o.minDropPct) {
    return false;
  }

  const prev = asks[asks.length - 2];
  const last = asks[asks.length - 1];
  const breakdownLevel = neckline * (1 - o.breakdownPct / 100);
  return prev >= neckline && last <= breakdownLevel;
}

function evaluateDoubleTop({ bars }: ChartPatternEvaluateInput): boolean {
  return detectDoubleTop(bars);
}

export const doubleTopDetector: ChartPatternDetector = {
  id: 'double_top',
  titleJa: 'S - ダブルトップ',
  signal: 'sell',
  evaluate: evaluateDoubleTop
};
