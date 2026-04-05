import { BRANDS } from '../config';
import { CHART_PATTERN_HISTORY_HOURS } from '../lib/constant';
import { loadPriceBarsForBrand } from './loadPriceBars';
import { CHART_PATTERN_DETECTORS } from './registry';

/**
 * 登録済みの全チャートパターンを全銘柄に対して走査し、Slack 用のセクション文字列の配列を返す。
 * 銘柄ごとに priceRateHistory は1回だけ読み、全パターンで同じバーを使う（パターン追加時もDB負荷が増えにくい）。
 */
export async function allCheckChartPatterns(): Promise<string[]> {
  const since = new Date(Date.now() - CHART_PATTERN_HISTORY_HOURS * 60 * 60 * 1000);
  const linesByDetectorId = new Map<string, string[]>();
  for (const d of CHART_PATTERN_DETECTORS) {
    linesByDetectorId.set(d.id, []);
  }

  for (const brand of BRANDS) {
    const brandUpper = brand.toUpperCase();
    const bars = await loadPriceBarsForBrand(brandUpper, since);
    for (const detector of CHART_PATTERN_DETECTORS) {
      if (detector.evaluate({ brand: brandUpper, bars })) {
        linesByDetectorId.get(detector.id)!.push(brandUpper);
      }
    }
  }

  const sections: string[] = [];
  let ssBuyCount = 0;
  let ssSellCount = 0;
  for (const detector of CHART_PATTERN_DETECTORS) {
    const brands = linesByDetectorId.get(detector.id) ?? [];
    if (brands.length > 0) {
      const sideLabel = detector.signal === 'buy' ? '買い' : '売り';
      sections.push(`~~~  ${detector.titleJa}（${sideLabel}候補） ~~~\n${brands.join(', ')}`);
      if (detector.titleJa.startsWith('SS')) {
        if (detector.signal === 'buy') ssBuyCount++;
        else ssSellCount++;
      }
    }
  }

  if (sections.length === 0) return [];

  const emojiPrefix = '💰'.repeat(ssBuyCount) + '🔥'.repeat(ssSellCount);
  const header = emojiPrefix.length > 0 ? `${emojiPrefix}\n--- チャートパターン ---` : '--- チャートパターン ---';
  return [header, ...sections];
}
