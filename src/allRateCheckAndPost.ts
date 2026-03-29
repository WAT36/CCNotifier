import { allUpdateShopRate } from './allUpdateShopRate';
import { compareDataAndAssets } from './compareDataAndAssets';
import { allCheckShopSellTime } from './allCheckShopSellTime';
import { allCheckChartPatterns } from './chartPatterns';
import { postWebhook } from './postWebhook';

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
}

if (require.main === module) {
  allRateCheckAndPost();
}
