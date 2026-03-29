/**
 * チャートパターン検出の共通型。
 * 新しいパターンを追加する手順:
 * 1. patterns/ 以下に検出ロジックと ChartPatternDetector を実装
 * 2. registry.ts の CHART_PATTERN_DETECTORS に登録
 */

export type PriceBar = { time: Date; ask: number };

/** 買い示唆 / 売り示唆（Slack 見出し・文言に利用） */
export type ChartSignalSide = 'buy' | 'sell';

export type ChartPatternEvaluateInput = {
  brand: string;
  bars: PriceBar[];
};

/**
 * 登録用インターフェース。各パターンはこれを満たすオブジェクトを export する。
 * ヒット時は通貨名が Slack に一覧表示される（文言は allCheckChartPatterns 側で組み立て）。
 */
export type ChartPatternDetector = {
  /** ログや将来のフィルタ用の安定した識別子 */
  id: string;
  /** Slack セクション見出し用（例: 上昇三角） */
  titleJa: string;
  /** このパターンが示すのは買いか売りか */
  signal: ChartSignalSide;
  evaluate: (input: ChartPatternEvaluateInput) => boolean;
};
