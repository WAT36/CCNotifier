import { BRANDS, messageTemplate } from "./config";
import { CheckSellResult, checkSellTime } from "./checkSellTime";

export async function allCheckSellTime() {
  const results: CheckSellResult[] = [];
  for (const brand of BRANDS) {
    results.push(await checkSellTime(brand.toUpperCase()));
  }

  let messages: string[] = [];
  messages.push("--- !!! 売り時 !!! ---");
  const sells = results
    .filter((res) => res.recommend === "sell")
    .sort((a, b) => {
      if (
        a.sell &&
        b.sell &&
        a.sell?.gainsGrowthRate < b.sell?.gainsGrowthRate
      ) {
        return 1;
      } else if (
        a.sell &&
        b.sell &&
        a.sell?.gainsGrowthRate > b.sell?.gainsGrowthRate
      ) {
        return -1;
      }
      return 0;
    })
    .map((res) => {
      const { brand, sell } = res;
      return sell
        ? messageTemplate.SELL(
            brand,
            sell.allSoldValueYen,
            sell.yenBet,
            sell.gainsYen,
            sell.gainsGrowthRate
          )
        : "";
    });
  messages = messages.concat(sells);
  messages.push("---------------------");

  messages.push("--- !!! 買い時 !!! ---");
  const buys = results
    .filter((res) => res.recommend === "buy")
    .sort((a, b) => {
      if (a.buy && b.buy && a.buy?.comparisonRate < b.buy?.comparisonRate) {
        return -1;
      } else if (
        a.buy &&
        b.buy &&
        a.buy?.comparisonRate > b.buy?.comparisonRate
      ) {
        return 1;
      }
      return 0;
    })
    .map((res) => {
      const { brand, buy } = res;
      return buy
        ? messageTemplate.BUY(
            brand,
            buy.lastBuyRate,
            buy.nowBuyRate,
            buy.comparisonRate
          )
        : "";
    });
  messages = messages.concat(buys);
  messages.push("---------------------");

  messages.push("------- ステイ -------");
  const stays = results
    .filter((res) => res.recommend === "stay")
    .map((res) => {
      const { brand, stay } = res;
      return stay
        ? messageTemplate.STAY(brand, stay.nowSellRate, stay.nowBuyRate)
        : "";
    });
  messages = messages.concat(stays);
  messages.push("---------------------");

  messages.push("------- な　し -------");
  const nones = results
    .filter((res) => res.recommend === "none")
    .map((res) => {
      const { brand } = res;
      return messageTemplate.NONE(brand);
    });
  messages = messages.concat(nones);
  messages.push("---------------------");
  return messages;
}

allCheckSellTime();
