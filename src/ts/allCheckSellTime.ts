import { BRANDS } from "./config";
import { checkSellTime } from "./checkSellTime";

async function allCheckSellTime() {
  for (const brand of BRANDS) {
    await checkSellTime(brand.toUpperCase());
  }
}

allCheckSellTime();
