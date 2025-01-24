import { allUpdateShopRate } from "./allUpdateShopRate";
import { compareDataAndAssets } from "./compareDataAndAssets";
import { allCheckSellTime } from "./allCheckSellTime";
import { postWebhook } from "./postWebhook";

// 定期バッチを手動で実行させる
export async function manualAllCheckSellTime() {
  // all update rate
  await allUpdateShopRate();

  // assets compare
  const compareResult = await compareDataAndAssets();

  // all check sell time
  const allCheckResult = await allCheckSellTime();

  // send data
  const requestData =
    "--- compare NG ---\n" +
    (compareResult.ng.length === 0
      ? "全て相違なし！\n"
      : compareResult.ng.join("\n")) +
    "---            ---\n" +
    "--- sell check ---\n" +
    allCheckResult.join("\n");
  await postWebhook(requestData);
}

manualAllCheckSellTime();
