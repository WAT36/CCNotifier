import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
export const prisma: PrismaClient = new PrismaClient();

/**
 * 銘柄が売り時かを確認する
 * 事前にtradeHistory、brandBidAskテーブルに最新データを登録しておくこと
 *
 * 実行方法は
 * npx ts-node src/checkSellTime.ts 銘柄名
 */

export type CheckSellResult = {
  brand: string;
  recommend?: "none" | "sell" | "buy" | "stay" | "error";
  sell?: {
    allSoldValueYen: number; // 全部売った時の円
    gainsYen: number; // 全部売った時の利益円
    gainsGrowthRate: number; // 全部売った時の円、現在掛けている円の比率
    nowSellRate: number; // 現在の売却レート
    nowAmount: number; //  現在の保有量
    yenBet: number; //  現在掛けている円
  };
  buy?: {
    lastBuyRate: number; // 最後に買った時のレート
    nowBuyRate: number; // 現在の購入レート
    lastBuyYen: number; // 最後に買った時の円
    comparisonRate: number; // 最後に買った時のレート、現在の購入レートの比率
  };
  stay?: {
    nowSellRate: number; // 現在の売却レート
    nowBuyRate: number; // 現在の購入レート
    lastBuyRate: number; // 最後に買った時のレート
    allSoldValueYen: number; // 全部売った時の円
    yenBet: number; //  現在掛けている円
  };
};

export const checkSellTime = async (
  brand: string
): Promise<CheckSellResult> => {
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
            contract_payment: true,
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
      return {
        brand,
        recommend: "error",
      };
    }

    // 現在掛けている円
    const yenBet = brandData.now_yen_bet?.yen_bet;
    // 現在の保有数量
    const nowAmount = brandData.now_amount?.now_amount;
    // 最後に買った時のレート
    const lastBuyRate =
      brandData.latest_shop_trade?.buysell_category === "買" &&
      brandData.latest_shop_trade.contract_rate;
    // 最後に買った時の額
    const lastBuyYen =
      brandData.latest_shop_trade?.buysell_category === "買" &&
      brandData.latest_shop_trade.contract_payment;
    // 今の売却レート
    const nowSellRate = brandData.brandBidAsk?.bid_price;
    // 今の買値レート
    const nowBuyRate = brandData.brandBidAsk?.ask_price;

    // 判定結果
    const result: CheckSellResult = {
      brand,
    };
    if (!nowAmount || nowAmount === new Decimal(0) || !yenBet) {
      result.recommend = "none";
    } else if (
      nowSellRate &&
      nowAmount &&
      yenBet &&
      nowSellRate.toNumber() * nowAmount.toNumber() > yenBet
    ) {
      const allSoldValueYen = nowSellRate.toNumber() * nowAmount.toNumber();
      const gainsYen = allSoldValueYen - yenBet;
      const gainsGrowthRate = ((gainsYen / yenBet) * 100).toFixed(2);
      result.recommend = "sell";
      result.sell = {
        allSoldValueYen,
        gainsYen,
        gainsGrowthRate: Number(gainsGrowthRate),
        nowSellRate: nowSellRate.toNumber(),
        nowAmount: nowAmount.toNumber(),
        yenBet,
      };
    } else if (
      lastBuyRate &&
      nowBuyRate &&
      lastBuyYen &&
      lastBuyRate.toNumber() > nowBuyRate.toNumber()
    ) {
      const comparisonRate =
        (nowBuyRate.toNumber() / lastBuyRate.toNumber() - 1) * 100;
      result.recommend = "buy";
      result.buy = {
        lastBuyRate: lastBuyRate.toNumber(),
        nowBuyRate: nowBuyRate.toNumber(),
        lastBuyYen: lastBuyYen.toNumber(),
        comparisonRate,
      };
    } else {
      result.recommend = "stay";
      result.stay = {
        nowSellRate: nowSellRate?.toNumber() || -1,
        nowBuyRate: nowBuyRate?.toNumber() || -1,
        lastBuyRate: lastBuyRate ? lastBuyRate.toNumber() : -1,
        allSoldValueYen:
          (nowSellRate?.toNumber() || NaN) * (nowAmount?.toNumber() || NaN),
        yenBet,
      };
    }

    return result;
  } catch (error) {
    console.error("データの登録に失敗しました:", error);
    return {
      brand,
      recommend: "error",
    };
  }
};

// 引数チェック
if (process.argv[1] === __filename && process.argv.length !== 3) {
  console.error("Error: Usage: npx ts-node src/checkSellTime.ts brand");
  process.exit(1);
} else if (process.argv[1] === __filename) {
  checkSellTime(process.argv[2].toUpperCase());
}
