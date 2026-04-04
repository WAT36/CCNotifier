/**
 * 三角持ち合い下抜け（売り候補）。
 * 高値切り下げ・安値切り上げで収束した後、下側ラインを下抜ける形を検出する。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type SymmetricalTriangleBreakdownOptions = {
  minBars: number;
  staleMs: number;
  breakdownPct: number;
  minConvergenceRatio: number;
};

const defaultOptions: SymmetricalTriangleBreakdownOptions = {
  minBars: 36,
  staleMs: 3 * 60 * 60 * 1000,
  breakdownPct: 0.15,
  minConvergenceRatio: 0.22
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

function calcSlope(i1: number, y1: number, i2: number, y2: number): number {
  const dx = i2 - i1;
  if (dx <= 0) {
    return 0;
  }
  return (y2 - y1) / dx;
}

/**
 * 簡易判定:
 * - 直近3高値が切り下げ、3安値が切り上げ
 * - 上ラインは負傾き、下ラインは正傾き
 * - 幅が十分に収束（開始時より終端で狭い）
 * - 最新値が下ラインを下抜け（直前バーは未突破）
 */
export function detectSymmetricalTriangleBreakdown(
  bars: PriceBar[],
  options: Partial<SymmetricalTriangleBreakdownOptions> = {}
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
  const troughs = findTroughIndices(asks);
  if (peaks.length < 3 || troughs.length < 3) {
    return false;
  }

  const p1i = peaks[peaks.length - 3];
  const p2i = peaks[peaks.length - 2];
  const p3i = peaks[peaks.length - 1];
  const t1i = troughs[troughs.length - 3];
  const t2i = troughs[troughs.length - 2];
  const t3i = troughs[troughs.length - 1];

  const p1 = asks[p1i];
  const p2 = asks[p2i];
  const p3 = asks[p3i];
  const t1 = asks[t1i];
  const t2 = asks[t2i];
  const t3 = asks[t3i];

  const descendingPeaks = p1 > p2 && p2 > p3;
  const ascendingTroughs = t1 < t2 && t2 < t3;
  if (!descendingPeaks || !ascendingTroughs) {
    return false;
  }

  const upperSlope = calcSlope(p1i, p1, p3i, p3);
  const lowerSlope = calcSlope(t1i, t1, t3i, t3);
  if (!(upperSlope < 0 && lowerSlope > 0)) {
    return false;
  }

  const startIdx = Math.max(0, Math.min(p1i, t1i));
  const endIdx = asks.length - 1;
  const upperAtStart = p1 + upperSlope * (startIdx - p1i);
  const lowerAtStart = t1 + lowerSlope * (startIdx - t1i);
  const upperAtEnd = p3 + upperSlope * (endIdx - p3i);
  const lowerAtEnd = t3 + lowerSlope * (endIdx - t3i);

  const widthStart = upperAtStart - lowerAtStart;
  const widthEnd = upperAtEnd - lowerAtEnd;
  if (!(widthStart > 0 && widthEnd > 0 && widthEnd < widthStart)) {
    return false;
  }

  const convergenceRatio = (widthStart - widthEnd) / widthStart;
  if (convergenceRatio < o.minConvergenceRatio) {
    return false;
  }

  const lastAsk = asks[asks.length - 1];
  const prevAsk = asks[asks.length - 2];
  const breakdownLevel = lowerAtEnd * (1 - o.breakdownPct / 100);
  return prevAsk > lowerAtEnd && lastAsk <= breakdownLevel;
}

function evaluateSymmetricalTriangleBreakdown({ bars }: ChartPatternEvaluateInput): boolean {
  return detectSymmetricalTriangleBreakdown(bars);
}

export const symmetricalTriangleBreakdownDetector: ChartPatternDetector = {
  id: 'symmetrical_triangle_breakdown',
  titleJa: 'A - 三角持ち合い下抜け',
  signal: 'sell',
  evaluate: evaluateSymmetricalTriangleBreakdown
};
