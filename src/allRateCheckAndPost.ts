import { allUpdateShopRate } from "./allUpdateShopRate";
import { compareDataAndAssets } from "./compareDataAndAssets";
import { allCheckSellTime } from "./allCheckSellTime";
import { postWebhook } from "./postWebhook";

// 定期バッチを手動で実行させる
export async function allRateCheckAndPost() {
  // all update rate
  await allUpdateShopRate();

  // assets compare
  const compareResult = await compareDataAndAssets();

  // all check sell time
  const allCheckResult = await allCheckSellTime();

  // send data
  const requestData =
    (compareResult.ng.length > 0
      ? `※比較NGが ${compareResult.ng.length} 件あります\n`
      : "") +
    allCheckResult.join("\n") +
    (compareResult.ng.length === 0
      ? ""
      : "--- compare NG ---\n" + compareResult.ng.join("\n"));
  await postWebhook(requestData);
}

//allRateCheckAndPost();
