import { allUpdateShopRate } from './allUpdateShopRate';
import { compareDataAndAssets } from './compareDataAndAssets';
import { allCheckShopSellTime } from './allCheckShopSellTime';
import { allCheckChartPatterns } from './chartPatterns';
import { postWebhook } from './postWebhook';
import { fetchMinGmtPrice, fetchRecordMinGmtPrice } from './getGmtMinPrice';
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

  // 最低価格の取得（DBへの保存も行われる）
  const sneakerResults = await Promise.allSettled(SNEAKER_CHAINS.map((chain) => fetchMinGmtPrice(chain.id)));

  // 保存後にDBから歴代最安値を取得
  const recordMins = await Promise.allSettled(SNEAKER_CHAINS.map((chain) => fetchRecordMinGmtPrice(chain.id)));

  const sneakerLines = SNEAKER_CHAINS.map((chain, i) => {
    const currentResult = sneakerResults[i];
    if (currentResult?.status !== 'fulfilled') {
      return `${chain.label}: N/A`;
    }
    const current = currentResult.value;

    const recordResult = recordMins[i];
    const recordMin = recordResult?.status === 'fulfilled' ? recordResult.value : null;

    let diffText = '';
    if (recordMin !== null && recordMin > 0) {
      const diffPct = ((current - recordMin) / recordMin) * 100;
      if (Math.abs(diffPct) < 0.01) {
        diffText = '  ★ 新最安値';
      } else {
        diffText = `  (最安値比: +${diffPct.toFixed(1)}%  最安値: ${recordMin})`;
      }
    }

    return `${chain.label}: ${current}${diffText}`;
  });
  const hasNewRecord = sneakerLines.some((line) => line.includes('★ 新最安値'));
  const sneakerHeader = hasNewRecord ? 'Sneakerの現在最低値 🎉' : 'Sneakerの現在最低値';
  await postWebhook(`${sneakerHeader}\n${sneakerLines.join('\n')}`);
}

if (require.main === module) {
  allRateCheckAndPost();
}
