import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
export const prisma: PrismaClient = new PrismaClient();

export const checkSellTime = async (brand: string) => {
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

    // メッセージ
    let message = "";
    if (!nowAmount || nowAmount === new Decimal(0)) {
      message = `${brand}:保有数量0です`;
    } else if (!yenBet) {
      message = `${brand}:全く買っていません`;
    } else if (
      nowSellRate &&
      nowAmount &&
      yenBet &&
      nowSellRate.toNumber() * nowAmount.toNumber() > yenBet
    ) {
      message = `${brand}:売り時です！！\t(　全売値 ${
        nowSellRate.toNumber() * nowAmount.toNumber()
      } 円\t>\t掛値 ${yenBet} 円,\t${
        nowSellRate.toNumber() * nowAmount.toNumber() - yenBet
      }円得)`;
    } else if (
      lastBuyRate &&
      nowBuyRate &&
      lastBuyRate.toNumber() > nowBuyRate.toNumber()
    ) {
      message = `${brand}:買い時です！！\t(最終買値 ${lastBuyRate} 円\t>\t現在買値 ${nowBuyRate} 円)`;
    } else {
      message = `${brand}:特に売り買い時ではありません\t(売却価格 ${nowSellRate} 円,\t購入価格 ${nowBuyRate} 円)`;
    }

    console.log(message);
    return message;
  } catch (error) {
    console.error("データの登録に失敗しました:", error);
  }
};