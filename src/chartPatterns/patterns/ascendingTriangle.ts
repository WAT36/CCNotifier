/**
 * 上昇三角 (Ascending Triangle) — 買い候補として扱う。
 * 水平抵抗 + 切上げ安 + ブレイク／形成の判定は detectAscendingTriangle のみ。
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

export type AscendingTriangleDetection =
  | { kind: 'none' }
  | { kind: 'forming'; resistanceYen: number; lastAsk: number; peakTouches: number }
  | { kind: 'breakout'; resistanceYen: number; lastAsk: number; peakTouches: number };

export type AscendingTriangleOptions = {
  resistanceTolerancePct: number;
  minBars: number;
  breakoutPct: number;
  recentPeakMaxAgeBars: number;
  nearResistanceBelowPct: number;
  staleMs: number;
};

const defaultOptions: AscendingTriangleOptions = {
  resistanceTolerancePct: 1.0,
  minBars: 36,
  breakoutPct: 0.2,
  recentPeakMaxAgeBars: 48,
  nearResistanceBelowPct: 1.5,
  staleMs: 3 * 60 * 60 * 1000
};

function findPeakIndices(asks: number[]): number[] {
  const raw: number[] = [];
  for (let i = 1; i < asks.length - 1; i++) {
    if (asks[i] >= asks[i - 1] && asks[i] >= asks[i + 1]) {
      raw.push(i);
    }
  }
  const merged: number[] = [];
  for (const idx of raw) {
    if (merged.length === 0) {
      merged.push(idx);
    } else {
      const prev = merged[merged.length - 1];
      if (idx === prev + 1 && asks[idx] === asks[prev]) {
        merged[merged.length - 1] = idx;
      } else {
        merged.push(idx);
      }
    }
  }
  return merged;
}

function minAskExclusive(asks: number[], loPeak: number, hiPeak: number): number | null {
  const from = loPeak + 1;
  const to = hiPeak - 1;
  if (from > to) {
    return null;
  }
  let m = asks[from];
  for (let i = from + 1; i <= to; i++) {
    m = Math.min(m, asks[i]);
  }
  return m;
}

export function detectAscendingTriangle(
  bars: PriceBar[],
  options: Partial<AscendingTriangleOptions> = {}
): AscendingTriangleDetection {
  const o = { ...defaultOptions, ...options };
  if (bars.length < o.minBars) {
    return { kind: 'none' };
  }

  const lastBar = bars[bars.length - 1];
  if (Date.now() - lastBar.time.getTime() > o.staleMs) {
    return { kind: 'none' };
  }

  const asks = bars.map((b) => b.ask);
  if (asks.some((x) => !Number.isFinite(x) || x <= 0)) {
    return { kind: 'none' };
  }

  const peaks = findPeakIndices(asks);
  if (peaks.length < 3) {
    return { kind: 'none' };
  }

  const a = peaks[peaks.length - 3];
  const b = peaks[peaks.length - 2];
  const c = peaks[peaks.length - 1];

  if (bars.length - 1 - c > o.recentPeakMaxAgeBars) {
    return { kind: 'none' };
  }

  const p1 = asks[a];
  const p2 = asks[b];
  const p3 = asks[c];
  const peakMin = Math.min(p1, p2, p3);
  const peakMax = Math.max(p1, p2, p3);
  const peakMean = (p1 + p2 + p3) / 3;
  const bandRatio = peakMean > 0 ? (peakMax - peakMin) / peakMean : 1;
  if (bandRatio > o.resistanceTolerancePct / 100) {
    return { kind: 'none' };
  }

  const t1 = minAskExclusive(asks, a, b);
  const t2 = minAskExclusive(asks, b, c);
  if (t1 === null || t2 === null) {
    return { kind: 'none' };
  }
  if (!(t2 > t1)) {
    return { kind: 'none' };
  }

  const firstSwing = Math.min(p1, p2) - t1;
  const secondSwing = Math.min(p2, p3) - t2;
  if (firstSwing > 0 && secondSwing > firstSwing * 1.25) {
    return { kind: 'none' };
  }

  const resistanceYen = peakMax;
  const lastAsk = asks[asks.length - 1];
  const breakoutLevel = resistanceYen * (1 + o.breakoutPct / 100);
  const nearBelow = resistanceYen * (1 - o.nearResistanceBelowPct / 100);

  if (lastAsk >= breakoutLevel) {
    return { kind: 'breakout', resistanceYen, lastAsk, peakTouches: 3 };
  }

  if (lastAsk >= nearBelow && lastAsk < breakoutLevel) {
    return { kind: 'forming', resistanceYen, lastAsk, peakTouches: 3 };
  }

  return { kind: 'none' };
}

function evaluateAscendingTriangle({ bars }: ChartPatternEvaluateInput): boolean {
  const det = detectAscendingTriangle(bars);
  return det.kind === 'breakout' || det.kind === 'forming';
}

export const ascendingTriangleDetector: ChartPatternDetector = {
  id: 'ascending_triangle',
  titleJa: '上昇三角',
  signal: 'buy',
  evaluate: evaluateAscendingTriangle
};
