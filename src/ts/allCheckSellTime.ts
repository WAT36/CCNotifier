import { BRANDS } from "./config";
import { checkSellTime } from "./checkSellTime";

async function allCheckSellTime() {
  const messages = [];
  for (const brand of BRANDS) {
    messages.push(await checkSellTime(brand.toUpperCase()));
  }
  return messages;
}

allCheckSellTime();