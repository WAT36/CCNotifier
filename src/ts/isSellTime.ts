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
    // 銘柄のデータ取得
    const brandData = await prisma.brand.findUnique({
      select: {
        name: true,
        now_yen_bet: {
          select: {
            yen_bet: true,
          },
        },
        now_amount: {
          select: {
            contract_amount: true,
            givetake_amount: true,
            now_amount: true,
          },
        },
        latest_shop_trade: {
          select: {
            buysell_category: true,
            contract_rate: true,
          },
        },
        brandBidAsk: {
          select: {
            bid_price: true,
            ask_price: true,
          },
        },
      },
      where: {
        name: brand,
      },
    });

    if (!brandData) {
      console.error("銘柄のデータがありません");
      return;
    }

    // 現在掛けている円
    const yenBet = brandData.now_yen_bet?.yen_bet;
    // 現在の保有数量
    const nowAmount = brandData.now_amount?.now_amount;
    // 最後に買った時のレート
    const lastBuyRate =
      brandData.latest_shop_trade?.buysell_category === "買" &&
      brandData.latest_shop_trade.contract_rate;
    // 今の売却レート
    const nowSellRate = brandData.brandBidAsk?.ask_price;
    // 今の買値レート
    const nowBuyRate = brandData.brandBidAsk?.bid_price;

    let isTime = false;
    if (!nowAmount || nowAmount === new Decimal(0)) {
      console.log(`${brand}:保有数量0です`);
      isTime = true;
    } else if (!yenBet) {
      console.log(`${brand}:全く買っていません`);
      isTime = true;
    }

    if (
      nowSellRate &&
      nowAmount &&
      yenBet &&
      nowSellRate.toNumber() * nowAmount.toNumber() > yenBet
    ) {
      console.log(
        `${brand}:売り時です！！\t(　全売値 ${
          nowSellRate.toNumber() * nowAmount.toNumber()
        } 円\t>\t掛値 ${yenBet} 円,\t${
          nowSellRate.toNumber() * nowAmount.toNumber() - yenBet
        }円得)`
      );
      isTime = true;
    }

    if (
      lastBuyRate &&
      nowBuyRate &&
      lastBuyRate.toNumber() > nowBuyRate.toNumber()
    ) {
      console.log(
        `${brand}:買い時です！！\t(最終買値 ${lastBuyRate} 円\t>\t現在買値 ${nowBuyRate} 円)`
      );
      isTime = true;
    }

    if (!isTime) {
      console.log(
        `${brand}:特に売り買い時ではありません\t(売却価格 ${nowSellRate} 円,\t購入価格 ${nowBuyRate} 円)`
      );
    }
  } catch (error) {
    console.error("データの登録に失敗しました:", error);
  }
})();
