import { allCheckSellTime } from "./allCheckSellTime";
import { allUpdateShopRate } from "./allUpdateShopRate";
import { compareDataAndAssets } from "./compareDataAndAssets";
import { postWebhook } from "./postWebhook";

export const handler = async (event: any) => {
  console.log("event:");
  console.log(event);

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
};
