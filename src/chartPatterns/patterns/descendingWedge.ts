/**
 * 下降ウェッジ（買い候補）。
 * 高値・安値とも切り下げながら値幅が収束し、最後に上側ラインを上抜ける形を検出する。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type DescendingWedgeOptions = {
  minBars: number;
  staleMs: number;
  breakoutPct: number;
  minConvergenceRatio: number;
};

const defaultOptions: DescendingWedgeOptions = {
  minBars: 40,
  staleMs: 3 * 60 * 60 * 1000,
  breakoutPct: 0.15,
  minConvergenceRatio: 0.18
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
 * - 直近3高値・3安値が切り下げ
 * - 高値ライン/安値ラインは共に負傾き
 * - 高値ラインの下落傾きが安値ラインより強く、上下の幅が縮む（ウェッジ収束）
 * - 最新値が上側ラインを上抜け
 */
export function detectDescendingWedge(bars: PriceBar[], options: Partial<DescendingWedgeOptions> = {}): boolean {
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

  if (!(p1 > p2 && p2 > p3 && t1 > t2 && t2 > t3)) {
    return false;
  }

  const upperSlope = calcSlope(p1i, p1, p3i, p3);
  const lowerSlope = calcSlope(t1i, t1, t3i, t3);
  if (!(upperSlope < 0 && lowerSlope < 0)) {
    return false;
  }

  // 下降ウェッジ: 上側の方が急角度で下がり、帯が収束する
  if (Math.abs(upperSlope) <= Math.abs(lowerSlope)) {
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
  if (!(widthStart > 0 && widthEnd > 0)) {
    return false;
  }

  const convergenceRatio = (widthStart - widthEnd) / widthStart;
  if (convergenceRatio < o.minConvergenceRatio) {
    return false;
  }

  const lastAsk = asks[asks.length - 1];
  const prevAsk = asks[asks.length - 2];
  const breakoutLevel = upperAtEnd * (1 + o.breakoutPct / 100);
  return prevAsk < upperAtEnd && lastAsk >= breakoutLevel;
}

function evaluateDescendingWedge({ bars }: ChartPatternEvaluateInput): boolean {
  return detectDescendingWedge(bars);
}

export const descendingWedgeDetector: ChartPatternDetector = {
  id: 'descending_wedge',
  titleJa: 'A - 下降ウェッジ',
  signal: 'buy',
  evaluate: evaluateDescendingWedge
};
