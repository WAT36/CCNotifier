/**
 * チャートパターン定義ファイル
 *
 * 【パターン追加方法】
 * patterns 配列にオブジェクトを追加するだけで自動検出対象になります。
 *
 * 【注意】PatternConditions に存在しないキーを使いたい場合は、
 * 1. PatternConditions の型定義にキーを追加する
 * 2. patternDetector.ts の extractFeatures() にそのキーの計算ロジックを追加する
 * の両方が必要です。どちらか片方だけでは動作しません。
 */

export type Signal = "buy" | "sell";

export interface PatternConditions {
  higherLows?: boolean;   // 安値が切り上がっているか
  lowerHighs?: boolean;   // 高値が切り下がっているか
  flatHighs?: boolean;    // 高値が横ばいか
  breakoutUp?: boolean;   // 上方ブレイクアウトがあるか
  breakoutDown?: boolean; // 下方ブレイクアウトがあるか
  slopePositive?: boolean; // 全体トレンドが右肩上がりか
  slopeNegative?: boolean; // 全体トレンドが右肩下がりか
}

export interface Pattern {
  id: string;
  name: string;
  signal: Signal;
  conditions: PatternConditions;
}

export const patterns: Pattern[] = [
  {
    id: "ascending_triangle",
    name: "アセンディングトライアングル（買いシグナル）",
    signal: "buy",
    conditions: {
      higherLows: true,
      breakoutUp: true,
      slopePositive: true,
    },
  },
  {
    id: "descending_triangle",
    name: "ディセンディングトライアングル（売りシグナル）",
    signal: "sell",
    conditions: {
      lowerHighs: true,
      breakoutDown: true,
      slopeNegative: true,
    },
  },
  // ← 今後ここにパターンを追加していく
];
