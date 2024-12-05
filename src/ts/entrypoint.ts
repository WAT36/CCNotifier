import { allCheckSellTime } from "./allCheckSellTime";
import { compareDataAndAssets } from "./compareDataAndAssets";
import { postWebhook } from "./postWebhook";

async function entrypoint() {
  // assets compare
  const compareResult = await compareDataAndAssets();

  // all check sell time
  const allCheckResult = await allCheckSellTime();

  // send data
  const requestData =
    compareResult.join("\n") + "\n" + allCheckResult.join("\n");
  await postWebhook(requestData);
}

entrypoint();
