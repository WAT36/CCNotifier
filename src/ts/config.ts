export const BRANDS = [
  "btc",
  "eth",
  "bch",
  "ltc",
  "xrp",
  "xlm",
  "bat",
  "xtz",
  "qtum",
  "dot",
  "atom",
  "ada",
  "mkr",
  "dai",
  "link",
  "doge",
  "sol",
  "fil",
  "sand",
  "chz",
  "avax",
];

export const BIDASK = ["bid", "ask"];

export const messageTemplate = {
  NONE: (brand: string) => `${brand}:保有数量0です。全く買っていません`,
  SELL: (
    brand: string,
    allSoldValueYen: number,
    yenBet: number,
    gainsYen: number,
    gainsGrowthRate: number
  ) =>
    `${brand}:\t(　全売値 ${allSoldValueYen} 円\t>\t掛値 ${yenBet} 円,\t${gainsYen.toFixed(
      2
    )}円得,\t伸び率 ${gainsGrowthRate}%)`,
  BUY: (
    brand: string,
    lastBuyRate: number,
    nowBuyRate: number,
    comparisonRate: number,
    lastBuyYen: number
  ) =>
    `${brand}:\t(最終買値 ${lastBuyRate} 円\t>\t現在買値 ${nowBuyRate} 円,\t比率 ${comparisonRate.toFixed(
      2
    )}%,\t(最後の購入額:${lastBuyYen}円))`,
  STAY: (brand: string, nowSellRate: number, nowBuyRate: number) =>
    `${brand}:特に売り買い時ではありません\t(売却価格 ${nowSellRate} 円,\t購入価格 ${nowBuyRate} 円)`,
};
