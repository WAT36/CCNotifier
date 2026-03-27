import { allUpdateShopRate } from './allUpdateShopRate';
import { compareDataAndAssets } from './compareDataAndAssets';
import { allCheckShopSellTime } from './allCheckShopSellTime';
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

  // send data
  if (allCheckResult.length > 0) {
    // メッセージがある場合は通知を送信
    const requestData =
      (compareResult.ng.length > 0 ? `※比較NGが ${compareResult.ng.length} 件あります\n` : '') +
      allCheckResult.join('\n') +
      (compareResult.ng.length === 0 ? '' : '--- compare NG ---\n' + compareResult.ng.join('\n'));
    await postWebhook(requestData);
  }
}

//allRateCheckAndPost();
