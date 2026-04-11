import { allUpdateShopRate } from './allUpdateShopRate';
import { compareDataAndAssets } from './compareDataAndAssets';
import { allCheckShopSellTime } from './allCheckShopSellTime';
import { allCheckChartPatterns } from './chartPatterns';
import { postWebhook } from './postWebhook';
import { fetchMinGmtPrice } from './getGmtMinPrice';
import { SNEAKER_CHAINS } from './lib/constant';

type AllRateCheckAndPostProps = {
  isRegularly?: boolean;
};
// 定期バッチを手動で実行させる
export async function allRateCheckAndPost({ isRegularly = false }: AllRateCheckAndPostProps = {}) {
  // all update rate
  try {
    await allUpdateShopRate();
  } catch (e) {
    await postWebhook('レート情報を取得できませんでした。メンテナンス中か、APIに問題が発生している可能性があります。');
    return;
  }

  // assets compare
  const compareResult = await compareDataAndAssets();

  // all check sell time
  const allCheckResult = await allCheckShopSellTime(isRegularly || false);

  // slackメッセージの作成（売り時、買い時、比較NG）
  const mainParts: string[] = [];
  if (allCheckResult.length > 0) {
    mainParts.push(
      (compareResult.ng.length > 0 ? `※比較NGが ${compareResult.ng.length} 件あります\n` : '') +
        allCheckResult.join('\n') +
        (compareResult.ng.length === 0 ? '' : '\n--- compare NG ---\n' + compareResult.ng.join('\n'))
    );
  } else if (compareResult.ng.length > 0) {
    mainParts.push(
      `※比較NGが ${compareResult.ng.length} 件あります\n--- compare NG ---\n${compareResult.ng.join('\n')}`
    );
  }

  // slackメッセージの送信（売り時、買い時、比較NG）
  if (mainParts.length > 0) {
    await postWebhook(mainParts.join('\n\n'));
  }

  // チャートパターンのチェック・Slackへの送信
  const chartPatternSections = await allCheckChartPatterns();
  if (chartPatternSections.length > 0) {
    await postWebhook(chartPatternSections.join('\n\n'));
  }

  // 最低価格の取得・Slackへの送信
  const sneakerResults = await Promise.allSettled(SNEAKER_CHAINS.map((chain) => fetchMinGmtPrice(chain.id)));
  const sneakerLines = SNEAKER_CHAINS.map((chain, i) => {
    const result = sneakerResults[i];
    const value = result?.status === 'fulfilled' ? String(result.value) : 'N/A';
    return `${chain.label}: ${value}`;
  });
  await postWebhook(`Sneakerの現在最低値\n${sneakerLines.join('\n')}`);
}

if (require.main === module) {
  allRateCheckAndPost();
}
