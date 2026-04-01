/**
 * 下降三角持ち合い（売り候補）。
 * 安値がほぼ同水準（水平サポート）で、高値が切り下がる収束を作った後に
 * サポートを下抜ける形を検出する。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type DescendingTriangleOptions = {
  minBars: number;
  staleMs: number;
  supportTolerancePct: number;
  breakdownPct: number;
};

const defaultOptions: DescendingTriangleOptions = {
  minBars: 36,
  staleMs: 3 * 60 * 60 * 1000,
  supportTolerancePct: 1.2,
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
 * - 直近3高値が切り下げ
 * - 直近3安値がほぼ同水準（水平サポート）
 * - 最新値がサポートを下抜け、1本前はサポート以上
 */
export function detectDescendingTriangle(bars: PriceBar[], options: Partial<DescendingTriangleOptions> = {}): boolean {
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
  const troughs = findTroughIndices(asks);
  if (peaks.length < 3 || troughs.length < 3) {
    return false;
  }

  const p1 = asks[peaks[peaks.length - 3]];
  const p2 = asks[peaks[peaks.length - 2]];
  const p3 = asks[peaks[peaks.length - 1]];
  if (!(p1 > p2 && p2 > p3)) {
    return false;
  }

  const t1 = asks[troughs[troughs.length - 3]];
  const t2 = asks[troughs[troughs.length - 2]];
  const t3 = asks[troughs[troughs.length - 1]];
  const support = Math.min(t1, t2, t3);
  const troughMean = (t1 + t2 + t3) / 3;
  const supportBandRatio = troughMean > 0 ? (Math.max(t1, t2, t3) - support) / troughMean : 1;
  if (supportBandRatio > o.supportTolerancePct / 100) {
    return false;
  }

  const prev = asks[asks.length - 2];
  const last = asks[asks.length - 1];
  const breakdownLevel = support * (1 - o.breakdownPct / 100);
  return prev >= support && last <= breakdownLevel;
}

function evaluateDescendingTriangle({ bars }: ChartPatternEvaluateInput): boolean {
  return detectDescendingTriangle(bars);
}

export const descendingTriangleDetector: ChartPatternDetector = {
  id: 'descending_triangle',
  titleJa: 'SS - 下降三角持ち合い',
  signal: 'sell',
  evaluate: evaluateDescendingTriangle
};
