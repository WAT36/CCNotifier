/**
 * 逆三尊（買い候補）。
 * 添付画像のような「途中で大きく下落した後、以前の高値帯（水平ライン）を最終的に上抜ける」形を検出する。
 * （厳密な三つの谷を取る実装ではなく、運用上の近似判定として扱う）
 */

import type { ChartPatternDetector, ChartPatternEvaluateInput, PriceBar } from '../types';

type ResistanceReclaimOptions = {
  minBars: number;
  staleMs: number;
  resistanceTolerancePct: number;
  breakoutPct: number;
  deepDipPct: number;
};

const defaultOptions: ResistanceReclaimOptions = {
  minBars: 36,
  staleMs: 3 * 60 * 60 * 1000,
  resistanceTolerancePct: 1.2,
  breakoutPct: 0.2,
  deepDipPct: 4.0
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
 * 判定ルール（簡易）:
 * - 直近2つの有意な高値がほぼ同水準（水平レジスタンス）
 * - その区間または以降で、レジスタンス比で十分深い下押しが一度ある
 * - 最新値がレジスタンスを上抜け、かつ1本前は下回っている（抜けた瞬間を重視）
 */
export function detectResistanceReclaimBreakout(
  bars: PriceBar[],
  options: Partial<ResistanceReclaimOptions> = {}
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
  if (peaks.length < 2) {
    return false;
  }

  // 直近2高値をレジスタンス候補にする
  const p1i = peaks[peaks.length - 2];
  const p2i = peaks[peaks.length - 1];
  const p1 = asks[p1i];
  const p2 = asks[p2i];
  const resistance = Math.max(p1, p2);
  const peakMean = (p1 + p2) / 2;

  // 2高値が同水準（水平抵抗）
  const bandRatio = peakMean > 0 ? Math.abs(p1 - p2) / peakMean : 1;
  if (bandRatio > o.resistanceTolerancePct / 100) {
    return false;
  }

  // 深い下押し（画像の大きなV字の下方向）を要求
  const dipFrom = Math.min(p1i, p2i);
  const dipTo = asks.length - 2; // 最後のバー直前までを見る
  if (dipFrom >= dipTo) {
    return false;
  }
  const minAfterPeaks = minInRange(asks, dipFrom, dipTo);
  const dipPct = ((resistance - minAfterPeaks) / resistance) * 100;
  if (dipPct < o.deepDipPct) {
    return false;
  }

  // 直近で明確にレジスタンス上抜け
  const prev = asks[asks.length - 2];
  const last = asks[asks.length - 1];
  const breakoutLevel = resistance * (1 + o.breakoutPct / 100);
  return prev < resistance && last >= breakoutLevel;
}

function evaluateResistanceReclaimBreakout({ bars }: ChartPatternEvaluateInput): boolean {
  return detectResistanceReclaimBreakout(bars);
}

export const resistanceReclaimBreakoutDetector: ChartPatternDetector = {
  id: 'resistance_reclaim_breakout',
  titleJa: 'SS - 逆三尊',
  signal: 'buy',
  evaluate: evaluateResistanceReclaimBreakout
};
