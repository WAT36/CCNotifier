/**
 * 下降フラッグ（Ascending Channel Breakdown）— 売り候補。
 * 高値も安値も切り上げながら往復し、最後に下側を下抜ける形を検出する。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type AscendingChannelOptions = {
  minBars: number;
  staleMs: number;
  slopeTolerancePerBar: number;
  breakdownPct: number;
};

const defaultOptions: AscendingChannelOptions = {
  minBars: 40,
  staleMs: 3 * 60 * 60 * 1000,
  slopeTolerancePerBar: 0.0005,
  breakdownPct: 0.15
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
 * 簡易な上昇チャネル判定:
 * - 直近の高値3点・安値3点がいずれも切り上げ
 * - 上側ライン/下側ラインの傾きがともに正で、ほぼ平行
 * - 最新値が下側ラインを一定率下抜け
 */
export function detectAscendingChannelBreakdown(
  bars: PriceBar[],
  options: Partial<AscendingChannelOptions> = {}
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

  // 高値・安値ともに切り上げ
  const ascendingPeaks = p1 < p2 && p2 < p3;
  const ascendingTroughs = t1 < t2 && t2 < t3;
  if (!ascendingPeaks || !ascendingTroughs) {
    return false;
  }

  const upperSlope = calcSlope(p1i, p1, p3i, p3);
  const lowerSlope = calcSlope(t1i, t1, t3i, t3);
  if (!(upperSlope > 0 && lowerSlope > 0)) {
    return false;
  }

  // 2本の傾きが近いほどチャネルとみなしやすい
  const slopeScale = Math.max(Math.abs(upperSlope), Math.abs(lowerSlope), 1e-9);
  if (Math.abs(upperSlope - lowerSlope) / slopeScale > 0.5) {
    return false;
  }

  // 最新時点での下側ライン推定値（t1-t3を外挿）
  const lowerAtLast = t3 + lowerSlope * (asks.length - 1 - t3i);
  if (!Number.isFinite(lowerAtLast) || lowerAtLast <= 0) {
    return false;
  }

  const lastAsk = asks[asks.length - 1];
  const breakdownLevel = lowerAtLast * (1 - o.breakdownPct / 100);
  if (lastAsk > breakdownLevel) {
    return false;
  }

  // 直前バーは下側ライン以上であることを確認して騙しを減らす
  const prevAsk = asks[asks.length - 2];
  const lowerAtPrev = t3 + lowerSlope * (asks.length - 2 - t3i);
  return prevAsk >= lowerAtPrev * (1 - o.slopeTolerancePerBar);
}

function evaluateAscendingChannelBreakdown({ bars }: ChartPatternEvaluateInput): boolean {
  return detectAscendingChannelBreakdown(bars);
}

export const ascendingChannelBreakdownDetector: ChartPatternDetector = {
  id: 'ascending_channel_breakdown',
  titleJa: 'A - 下降フラッグ',
  signal: 'sell',
  evaluate: evaluateAscendingChannelBreakdown
};
