/**
 * 上昇フラッグ「（Falling Channel Breakout）— 買い候補。
 * 添付画像のように「高値も安値も切り下げながら往復し、最後に上側を上抜け」を狙う。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type DescendingChannelOptions = {
  minBars: number;
  staleMs: number;
  slopeTolerancePerBar: number;
  breakoutPct: number;
};

const defaultOptions: DescendingChannelOptions = {
  minBars: 40,
  staleMs: 3 * 60 * 60 * 1000,
  slopeTolerancePerBar: 0.0005,
  breakoutPct: 0.15
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
 * 簡易な下降チャネル判定:
 * - 直近の高値3点・安値3点がいずれも切り下げ
 * - 上側ライン/下側ラインの傾きがともに負で、ほぼ平行
 * - 最新値が上側ラインを一定率上抜け
 */
export function detectDescendingChannelBreakout(
  bars: PriceBar[],
  options: Partial<DescendingChannelOptions> = {}
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
  const descendingTroughs = t1 > t2 && t2 > t3;
  if (!descendingPeaks || !descendingTroughs) {
    return false;
  }

  const upperSlope = calcSlope(p1i, p1, p3i, p3);
  const lowerSlope = calcSlope(t1i, t1, t3i, t3);
  if (!(upperSlope < 0 && lowerSlope < 0)) {
    return false;
  }

  // 2本の傾きが近いほどチャネルとみなしやすい
  const slopeScale = Math.max(Math.abs(upperSlope), Math.abs(lowerSlope), 1e-9);
  if (Math.abs(upperSlope - lowerSlope) / slopeScale > 0.5) {
    return false;
  }

  // 最新時点での上側ライン推定値（p1-p3を外挿）
  const upperAtLast = p3 + upperSlope * (asks.length - 1 - p3i);
  if (!Number.isFinite(upperAtLast) || upperAtLast <= 0) {
    return false;
  }

  const lastAsk = asks[asks.length - 1];
  const breakoutLevel = upperAtLast * (1 + o.breakoutPct / 100);
  if (lastAsk < breakoutLevel) {
    return false;
  }

  // 直近がすでに強く上抜けているなら、直前バーは上側ライン以下であることを確認して騙しを減らす
  const prevAsk = asks[asks.length - 2];
  const upperAtPrev = p3 + upperSlope * (asks.length - 2 - p3i);
  return prevAsk <= upperAtPrev * (1 + o.slopeTolerancePerBar);
}

function evaluateDescendingChannelBreakout({ bars }: ChartPatternEvaluateInput): boolean {
  return detectDescendingChannelBreakout(bars);
}

export const descendingChannelBreakoutDetector: ChartPatternDetector = {
  id: 'descending_channel_breakout',
  titleJa: 'S - 上昇フラッグ',
  signal: 'buy',
  evaluate: evaluateDescendingChannelBreakout
};
