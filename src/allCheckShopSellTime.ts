import { BRANDS, messageTemplate } from './config';
import { CheckShopSellResult, checkShopSellTime, fetchBrandAskStats } from './checkShopSellTime';
import {
  MIN_GAIN_YEN_SUM,
  HIGH_GROWTH_RATE_THRESHOLD,
  COMPARISON_RATE_MULTIPLIER,
  PERCENTAGE_MULTIPLIER
} from './lib/constant';
import { diffDaysHoursFromNow } from './lib/date';

export async function allCheckShopSellTime(isRegularly: boolean = false) {
  const results: CheckShopSellResult[] = [];
  for (const brand of BRANDS) {
    results.push(await checkShopSellTime(brand.toUpperCase()));
  }

  // 全銘柄の購入レート統計を並列取得し、brand → 比較テキスト のマップを作る
  const askStatsEntries = await Promise.all(
    BRANDS.map(async (brand) => {
      const stats = await fetchBrandAskStats(brand.toUpperCase());
      return [brand.toUpperCase(), stats] as const;
    })
  );
  const askStatsMap = new Map(askStatsEntries);

  const getAskComparisonText = (brand: string): string => {
    const stats = askStatsMap.get(brand);
    if (!stats) return '';
    const { currentAsk, historicalMinAsk } = stats;
    if (currentAsk === null || historicalMinAsk === null || historicalMinAsk <= 0) return '';
    const diffPct = ((currentAsk - historicalMinAsk) / historicalMinAsk) * 100;
    if (Math.abs(diffPct) < 0.01) return ' ★ 購入最安値';
    return ` (購入最安値比: +${diffPct.toFixed(1)}%  最安値: ${historicalMinAsk})`;
  };

  let messages: string[] = [];
  const gainsYenSum = results
    .filter((res) => res.recommend === 'sell')
    .reduce((accumulator, currentValue) => accumulator + (currentValue.sell?.gainsYen || 0), 0)
    .toFixed(2);
  messages.push(`--- !!! 売り時 !!! --- 総利益 ${gainsYenSum} 円`);
  const sells = results
    .filter((res) => res.recommend === 'sell')
    .sort((a, b) => {
      if (a.sell && b.sell && a.sell?.gainsGrowthRate < b.sell?.gainsGrowthRate) {
        return 1;
      } else if (a.sell && b.sell && a.sell?.gainsGrowthRate > b.sell?.gainsGrowthRate) {
        return -1;
      }
      return 0;
    })
    .map((res) => {
      const { brand, sell } = res;
      const diffDaysHours = diffDaysHoursFromNow(sell?.lastTradeDate);
      return sell
        ? messageTemplate.SELL(
            brand,
            sell.allSoldValueYen,
            sell.yenBet,
            sell.gainsYen,
            sell.gainsGrowthRate,
            diffDaysHours
          ) + getAskComparisonText(brand)
        : '';
    });
  messages = messages.concat(sells);
  messages.push('---------------------');

  messages.push('--- !!! 買い時 !!! ---');
  const buys = results
    .filter((res) => res.recommend === 'buy')
    .sort((a, b) => {
      if (a.buy && b.buy && a.buy?.comparisonRate < b.buy?.comparisonRate) {
        return -1;
      } else if (a.buy && b.buy && a.buy?.comparisonRate > b.buy?.comparisonRate) {
        return 1;
      }
      return 0;
    })
    .map((res) => {
      const { brand, buy } = res;
      const diffDaysHours = diffDaysHoursFromNow(buy?.lastTradeDate);
      return buy
        ? messageTemplate.BUY(
            brand,
            buy.lastBuyRate,
            buy.nowBuyRate,
            buy.comparisonRate,
            buy.lastBuyYen,
            diffDaysHours
          ) +
            (buy.comparisonRate <= -COMPARISON_RATE_MULTIPLIER * Math.log2(buy.lastBuyYen / PERCENTAGE_MULTIPLIER)
              ? '💥'
              : buy.comparisonRate <= -Math.log2(buy.lastBuyYen / PERCENTAGE_MULTIPLIER)
                ? '🌟'
                : '') +
            getAskComparisonText(brand)
        : '';
    });
  messages = messages.concat(buys);
  messages.push('---------------------');

  messages.push('------- ステイ -------');
  const stays = results
    .filter((res) => res.recommend === 'stay')
    .sort((a, b) => {
      if (a.stay && b.stay && a.stay?.targetIncreaseRate < b.stay?.targetIncreaseRate) {
        return -1;
      } else if (a.stay && b.stay && a.stay?.targetIncreaseRate > b.stay?.targetIncreaseRate) {
        return 1;
      }
      return 0;
    })
    .map((res) => {
      const { brand, stay } = res;
      const diffDaysHours = diffDaysHoursFromNow(stay?.lastTradeDate);
      return stay
        ? messageTemplate.STAY(
            brand,
            stay.nowSellRate,
            stay.nowBuyRate,
            stay.lastBuyRate,
            stay.allSoldValueYen,
            stay.yenBet,
            stay.targetIncreaseRate,
            diffDaysHours
          ) + getAskComparisonText(brand)
        : '';
    });
  messages = messages.concat(stays);
  messages.push('---------------------');

  messages.push('------- な　し -------');
  const nones = results
    .filter((res) => res.recommend === 'none')
    .map((res) => {
      const { brand } = res;
      return messageTemplate.NONE(brand) + getAskComparisonText(brand);
    });
  messages = messages.concat(nones);
  messages.push('---------------------');

  // 伸び率10%以上の個数を確認
  const highGrowthRates = results.filter(
    (res) =>
      res.recommend === 'sell' && res.sell?.gainsGrowthRate && res.sell?.gainsGrowthRate >= HIGH_GROWTH_RATE_THRESHOLD
  ).length;
  // 星の個数を確認、初めに総利益と星の個数を乗せる
  const burns = buys.filter((buy) => buy.includes('💥')).length;
  const stars = buys.filter((buy) => buy.includes('🌟')).length;
  // 定期実行時で伸び率10%以上なし、星無し、総利益1000円未満の場合はメッセージを出力しない
  if (isRegularly && highGrowthRates === 0 && stars === 0 && +gainsYenSum < MIN_GAIN_YEN_SUM) {
    return [];
  }
  // メッセージ冒頭に概略追記
  messages.unshift(
    (+gainsYenSum > 0 ? `総利益 ${gainsYenSum} 円, ` : '総利益なし, ') +
      (stars > 0 ? `🌟 ${stars} 個` : '星なし') +
      (burns > 0 ? `、⚠️💥 ${burns} 個⚠️` : '')
  );

  // 伸び率10%以上、星がある場合はメッセージ冒頭に上昇下降の絵を乗せる
  if (highGrowthRates > 0 || stars > 0) {
    messages.unshift('📈'.repeat(highGrowthRates) + '📉'.repeat(stars + burns));
  }
  return messages;
}

allCheckShopSellTime();
