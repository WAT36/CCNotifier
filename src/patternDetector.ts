import { PatternConditions, Signal, patterns } from './patternDefinitions';

const WINDOW_SIZE = 30;

/**
 * ローカル安値のインデックスを返す（前後 order 本より小さい点）
 */
function findLocalMinima(prices: number[], order: number = 3): number[] {
  const indices: number[] = [];
  for (let i = order; i < prices.length - order; i++) {
    let isMin = true;
    for (let j = 1; j <= order; j++) {
      if (prices[i] >= prices[i - j] || prices[i] >= prices[i + j]) {
        isMin = false;
        break;
      }
    }
    if (isMin) indices.push(i);
  }
  return indices;
}

/**
 * ローカル高値のインデックスを返す（前後 order 本より大きい点）
 */
function findLocalMaxima(prices: number[], order: number = 3): number[] {
  const indices: number[] = [];
  for (let i = order; i < prices.length - order; i++) {
    let isMax = true;
    for (let j = 1; j <= order; j++) {
      if (prices[i] <= prices[i - j] || prices[i] <= prices[i + j]) {
        isMax = false;
        break;
      }
    }
    if (isMax) indices.push(i);
  }
  return indices;
}

/**
 * 配列のインデックスと値から線形回帰の傾きを返す
 */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * (values[i] - meanY);
    denominator += (i - meanX) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 直近 N 本の価格リストから特徴量を計算して返す
 *
 * 【注意】新しい特徴量を追加する場合は、patternDefinitions.ts の
 * PatternConditions 型定義への追加も必要です。
 */
export function extractFeatures(prices: number[]): PatternConditions {
  const window = prices.slice(-WINDOW_SIZE);
  const latest = window[window.length - 1];
  const maxPrice = Math.max(...window);
  const minPrice = Math.min(...window);

  const minimaIndices = findLocalMinima(window);
  const maximaIndices = findLocalMaxima(window);
  const minimaValues = minimaIndices.map((i) => window[i]);
  const maximaValues = maximaIndices.map((i) => window[i]);

  // 安値が切り上がっているか（3点以上検出、回帰傾き正）
  const higherLows =
    minimaValues.length >= 3 && linearRegressionSlope(minimaValues) > 0;

  // 高値が切り下がっているか（3点以上検出、回帰傾き負）
  const lowerHighs =
    maximaValues.length >= 3 && linearRegressionSlope(maximaValues) < 0;

  // 高値が横ばいか（標準偏差が全価格の1%以内）
  let flatHighs = false;
  if (maximaValues.length >= 2) {
    const mean = maximaValues.reduce((a, b) => a + b, 0) / maximaValues.length;
    const variance =
      maximaValues.reduce((a, b) => a + (b - mean) ** 2, 0) /
      maximaValues.length;
    const stdDev = Math.sqrt(variance);
    flatHighs = stdDev <= maxPrice * 0.01;
  }

  // 上方ブレイクアウト（直近価格 > 直近N本の最高値 × 0.98）
  const breakoutUp = latest > maxPrice * 0.98;

  // 下方ブレイクアウト（直近価格 < 直近N本の最安値 × 1.02）
  const breakoutDown = latest < minPrice * 1.02;

  // 全体トレンドの傾き
  const overallSlope = linearRegressionSlope(window);
  const slopePositive = overallSlope > 0;
  const slopeNegative = overallSlope < 0;

  return {
    higherLows,
    lowerHighs,
    flatHighs,
    breakoutUp,
    breakoutDown,
    slopePositive,
    slopeNegative,
  };
}

/**
 * conditions の各キーについて features と比較し、
 * 一致数 ÷ 総条件数 をスコア（0.0〜1.0）で返す
 */
export function matchScore(
  features: PatternConditions,
  conditions: PatternConditions
): number {
  const keys = Object.keys(conditions) as (keyof PatternConditions)[];
  if (keys.length === 0) return 0;
  const matches = keys.filter((k) => features[k] === conditions[k]).length;
  return matches / keys.length;
}

export interface DetectedPattern {
  id: string;
  name: string;
  signal: Signal;
  score: number;
}

/**
 * 価格リストを受け取り、合致したチャートパターンをスコア降順で返す
 * スコアが 0.7 以上のパターンのみ返す
 */
export function detectPatterns(prices: number[]): DetectedPattern[] {
  if (prices.length < WINDOW_SIZE / 2) return [];

  const features = extractFeatures(prices);
  return patterns
    .map((p) => ({ id: p.id, name: p.name, signal: p.signal, score: matchScore(features, p.conditions) }))
    .filter((p) => p.score >= 0.7)
    .sort((a, b) => b.score - a.score);
}
