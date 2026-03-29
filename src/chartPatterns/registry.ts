import type { ChartPatternDetector } from './types';
import { ascendingTriangleDetector } from './patterns/ascendingTriangle';
import { descendingChannelBreakoutDetector } from './patterns/descendingChannelBreakout';

/**
 * ここに検出器を追加していく。順序は Slack 上のセクション表示順になる。
 * 売りシグナル用のパターンは signal: 'sell' の Detector を追加する。
 */
export const CHART_PATTERN_DETECTORS: ChartPatternDetector[] = [
  ascendingTriangleDetector,
  descendingChannelBreakoutDetector
];
