import { BRANDS, messageTemplate } from "./config";
import { CheckSellResult, checkSellTime } from "./checkSellTime";

export async function allCheckSellTime(isRegularly: boolean = false) {
  const results: CheckSellResult[] = [];
  for (const brand of BRANDS) {
    results.push(await checkSellTime(brand.toUpperCase()));
  }

  let messages: string[] = [];
  const gainsYenSum = results
    .filter((res) => res.recommend === "sell")
    .reduce(
      (accumulator, currentValue) =>
        accumulator + (currentValue.sell?.gainsYen || 0),
      0
    )
    .toFixed(2);
  messages.push(`--- !!! 売り時 !!! --- 総利益 ${gainsYenSum} 円`);
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
            buy.comparisonRate,
            buy.lastBuyYen
          ) +
            (buy.comparisonRate <= -Math.log2(buy.lastBuyYen / 100) ? "🌟" : "")
        : "";
    });
  messages = messages.concat(buys);
  messages.push("---------------------");

  messages.push("------- ステイ -------");
  const stays = results
    .filter((res) => res.recommend === "stay")
    .sort((a, b) => {
      if (
        a.stay &&
        b.stay &&
        a.stay?.targetIncreaseRate < b.stay?.targetIncreaseRate
      ) {
        return -1;
      } else if (
        a.stay &&
        b.stay &&
        a.stay?.targetIncreaseRate > b.stay?.targetIncreaseRate
      ) {
        return 1;
      }
      return 0;
    })
    .map((res) => {
      const { brand, stay } = res;
      return stay
        ? messageTemplate.STAY(
            brand,
            stay.nowSellRate,
            stay.nowBuyRate,
            stay.lastBuyRate,
            stay.allSoldValueYen,
            stay.yenBet,
            stay.targetIncreaseRate
          )
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

  // 伸び率10%以上の個数を確認
  const highGrowthRates = results.filter(
    (res) => (res.recommend === "sell" && res.sell?.gainsGrowthRate) || 0 >= 10
  ).length;
  // 星の個数を確認、初めに総利益と星の個数を乗せる
  const stars = buys.filter((buy) => buy.includes("🌟")).length;
  // 定期実行時で伸び率10%以上なし、星無し、総利益1000円未満の場合はメッセージを出力しない
  if (
    isRegularly &&
    highGrowthRates === 0 &&
    stars === 0 &&
    +gainsYenSum < 1000
  ) {
    return [];
  }
  // メッセージ冒頭に概略追記
  messages.unshift(
    (+gainsYenSum > 0 ? `総利益 ${gainsYenSum} 円, ` : "総利益なし, ") +
      (stars > 0 ? `🌟 ${stars} 個` : "星なし")
  );

  return messages;
}

allCheckSellTime();
