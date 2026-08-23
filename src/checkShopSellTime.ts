import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PERCENTAGE_MULTIPLIER, DECIMAL_PLACES } from './lib/constant';
import { prisma } from './lib/prisma';

/**
 * 銘柄が売り時かを確認する
 * 事前にtradeHistoryテーブルに最新データを登録しておくこと
 *
 * 実行方法は
 * npx ts-node src/checkSellTime.ts 銘柄名
 */

export type CheckShopSellResult = {
  brand: string;
  recommend?: 'none' | 'sell' | 'buy' | 'stay' | 'error';
  sell?: {
    allSoldValueYen: number; // 全部売った時の円
    gainsYen: number; // 全部売った時の利益円
    gainsGrowthRate: number; // 全部売った時の円、現在掛けている円の比率
    nowSellRate: number; // 現在の売却レート
    nowAmount: number; //  現在の保有量
    yenBet: number; //  現在掛けている円
    lastTradeDate?: Date; // 最後に売買した時の日付
  };
  buy?: {
    lastBuyRate: number; // 最後に買った時のレート
    nowBuyRate: number; // 現在の購入レート
    lastBuyYen: number; // 最後に買った時の円
    comparisonRate: number; // 最後に買った時のレート、現在の購入レートの比率
    lastTradeDate?: Date; // 最後に売買した時の日付
  };
  stay?: {
    nowSellRate: number; // 現在の売却レート
    nowBuyRate: number; // 現在の購入レート
    lastBuyRate: number; // 最後に買った時のレート
    allSoldValueYen: number; // 全部売った時の円(全売値)
    yenBet: number; //  現在掛けている円(掛値)
    targetIncreaseRate: number; // 全売値が掛値に届くためにあと何%上昇が必要かを示す指標(目標上昇率 と命名)
    lastTradeDate?: Date; // 最後に売買した時の日付
  };
};

// checkShopSellTime/fetchAllBrandSellData で共通利用するselect。
// findUnique(単一銘柄)・findMany(全銘柄一括)の両方から同じ形のデータを取得するため定義を共有する
export const brandSellDataSelect = {
  name: true,
  now_yen_bet: {
    select: {
      yen_bet: true
    }
  },
  now_amount: {
    select: {
      contract_amount: true,
      givetake_amount: true,
      now_amount: true
    }
  },
  latest_shop_trade: {
    select: {
      buysell_category: true,
      contract_rate: true,
      contract_payment: true,
      trade_date: true
    }
  },
  latest_price_rate: {
    select: {
      bid_price: true,
      ask_price: true
    }
  }
} satisfies Prisma.brandSelect;

export type BrandSellData = Prisma.brandGetPayload<{ select: typeof brandSellDataSelect }>;

// 銘柄一覧をまとめて1回のクエリで取得する（Prismaはfind|Manyだと関連もIN句でバッチ取得するため、
// brandごとにfindUniqueをループするより往復回数を大幅に減らせる）
export async function fetchAllBrandSellData(brands: string[]): Promise<Map<string, BrandSellData>> {
  const brandData = await prisma.brand.findMany({
    select: brandSellDataSelect,
    where: {
      name: { in: brands }
    }
  });
  return new Map(brandData.map((data) => [data.name, data]));
}

// 取得済みのbrandDataから売り時・買い時判定を行う（DBアクセスなしの純粋関数）
export function computeShopSellResult(brand: string, brandData: BrandSellData | undefined): CheckShopSellResult {
  if (!brandData) {
    console.error('銘柄のデータがありません');
    return {
      brand,
      recommend: 'error'
    };
  }

  // 現在掛けている円
  const yenBet = brandData.now_yen_bet?.yen_bet || 0;
  // 現在の保有数量
  const nowAmount = brandData.now_amount?.now_amount;
  // 最後に買った時のレート
  const lastBuyRate =
    brandData.latest_shop_trade?.buysell_category === '買' && brandData.latest_shop_trade.contract_rate;
  // 最後に買った時の額
  const lastBuyYen =
    brandData.latest_shop_trade?.buysell_category === '買' && brandData.latest_shop_trade.contract_payment;
  // 今の売却レート
  const nowSellRate = brandData.latest_price_rate?.bid_price;
  // 今の買値レート
  const nowBuyRate = brandData.latest_price_rate?.ask_price;

  // 判定結果
  const result: CheckShopSellResult = {
    brand
  };
  if (!nowAmount || nowAmount.equals(new Decimal(0))) {
    // 保有数量が0の場合は買い時も売り時もない
    result.recommend = 'none';
  } else if (
    nowSellRate &&
    nowAmount &&
    yenBet !== undefined &&
    nowSellRate.toNumber() * nowAmount.toNumber() > yenBet
  ) {
    // 売り時の場合
    const allSoldValueYen = nowSellRate.toNumber() * nowAmount.toNumber();
    const gainsYen = allSoldValueYen - yenBet;
    const gainsGrowthRate = ((gainsYen / yenBet) * PERCENTAGE_MULTIPLIER).toFixed(DECIMAL_PLACES);
    result.recommend = 'sell';
    result.sell = {
      allSoldValueYen,
      gainsYen,
      gainsGrowthRate: Number(gainsGrowthRate),
      nowSellRate: nowSellRate.toNumber(),
      nowAmount: nowAmount.toNumber(),
      lastTradeDate: brandData.latest_shop_trade?.trade_date,
      yenBet
    };
  } else if (lastBuyRate && nowBuyRate && lastBuyYen && lastBuyRate.toNumber() > nowBuyRate.toNumber()) {
    // 買い時の場合
    const comparisonRate = (nowBuyRate.toNumber() / lastBuyRate.toNumber() - 1) * PERCENTAGE_MULTIPLIER;
    result.recommend = 'buy';
    result.buy = {
      lastBuyRate: lastBuyRate.toNumber(),
      nowBuyRate: nowBuyRate.toNumber(),
      lastBuyYen: lastBuyYen.toNumber(),
      comparisonRate,
      lastTradeDate: brandData.latest_shop_trade?.trade_date
    };
  } else {
    // ステイの場合
    const allSoldValueYen = (nowSellRate?.toNumber() || NaN) * (nowAmount?.toNumber() || NaN);
    result.recommend = 'stay';
    result.stay = {
      nowSellRate: nowSellRate?.toNumber() || -1,
      nowBuyRate: nowBuyRate?.toNumber() || -1,
      lastBuyRate: lastBuyRate ? lastBuyRate.toNumber() : -1,
      allSoldValueYen,
      yenBet,
      targetIncreaseRate: (PERCENTAGE_MULTIPLIER * (yenBet - allSoldValueYen)) / allSoldValueYen,
      lastTradeDate: brandData.latest_shop_trade?.trade_date
    };
  }

  return result;
}

// 単一銘柄向け（CLIからの手動実行用）。まとめて処理する場合はfetchAllBrandSellData + computeShopSellResultを使う
export const checkShopSellTime = async (brand: string): Promise<CheckShopSellResult> => {
  try {
    const brandData = await prisma.brand.findUnique({
      select: brandSellDataSelect,
      where: {
        name: brand
      }
    });
    return computeShopSellResult(brand, brandData ?? undefined);
  } catch (error) {
    console.error('データの登録に失敗しました:', error);
    return {
      brand,
      recommend: 'error'
    };
  }
};

/**
 * 指定銘柄一覧の現在の購入レート（直近のask_price）と歴代最安の購入レート（ask_priceの最小値）を返す。
 * currentAskはbrandDataの latest_price_rate.ask_price をそのまま使うため追加クエリは発生しない。
 * historicalMinAskは全銘柄分をgroupByで1クエリにまとめて取得する。
 */
export async function fetchAskStatsMap(
  brands: string[],
  brandDataMap: Map<string, BrandSellData>
): Promise<Map<string, { currentAsk: number | null; historicalMinAsk: number | null }>> {
  const historicalMins = await prisma.priceRateHistory.groupBy({
    by: ['brand'],
    where: { brand: { in: brands } },
    _min: { ask_price: true }
  });
  const historicalMinMap = new Map(historicalMins.map((row) => [row.brand, row._min.ask_price]));

  return new Map(
    brands.map((brand) => {
      const currentAskDecimal = brandDataMap.get(brand)?.latest_price_rate?.ask_price;
      const historicalMinAsk = historicalMinMap.get(brand);
      return [
        brand,
        {
          currentAsk: currentAskDecimal != null ? Number(currentAskDecimal) : null,
          historicalMinAsk: historicalMinAsk != null ? Number(historicalMinAsk) : null
        }
      ];
    })
  );
}

// 引数チェック
if (process.argv[1] === __filename && process.argv.length !== 3) {
  console.error('Error: Usage: npx ts-node src/checkSellTime.ts brand');
  process.exit(1);
} else if (process.argv[1] === __filename) {
  checkShopSellTime(process.argv[2].toUpperCase());
}
