import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
export const prisma: PrismaClient = new PrismaClient();

/**
 * 銘柄が売り時かを確認する
 * 事前にtradeHistory、brandBidAskテーブルに最新データを登録しておくこと
 *
 * 実行方法は
 * npx ts-node src/isSellTime.ts 銘柄名
 */

// 引数チェック
if (process.argv.length !== 3) {
  console.error("Error: Usage: npx ts-node src/isSellTime.ts brand");
  process.exit(1);
}

const brand = process.argv[2].toUpperCase();

(async function isSellTime() {
  try {
    // 現在掛けている円
    const yenBet = (
      await prisma.now_yen_bet.findUnique({
        where: {
          brand,
        },
      })
    )?.yen_bet;

    // 現在の保有数量
    const nowAmount = (
      await prisma.now_amount.findUnique({
        where: {
          brand,
        },
      })
    )?.now_amount;

    // 最後に買った時のレート
    const lastBuyRate = (
      await prisma.latest_shop_trade.findFirst({
        where: {
          brand,
          buysell_category: "買",
        },
      })
    )?.contract_rate;

    // 今の売却レート
    const nowSellRate = (
      await prisma.brandBidAsk.findUnique({
        where: {
          brand,
        },
      })
    )?.ask_price;

    // 今の売却レート
    const nowBuyRate = (
      await prisma.brandBidAsk.findUnique({
        where: {
          brand,
        },
      })
    )?.bid_price;

    if (!nowAmount || nowAmount === new Decimal(0)) {
      console.log("保有数量0です");
    } else if (!yenBet) {
      console.log("全く買っていません");
    }

    if (
      nowSellRate &&
      nowAmount &&
      yenBet &&
      nowSellRate.toNumber() * nowAmount.toNumber() > yenBet
    ) {
      console.log("売り時です！！");
    }

    if (lastBuyRate && nowBuyRate && lastBuyRate > nowBuyRate) {
      console.log("買い時です！！");
    }
  } catch (error) {
    console.error("データの登録に失敗しました:", error);
  }
})();
