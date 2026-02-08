import { PrismaClient } from '@prisma/client';
import { getAssets } from './getAssets';
import { AssetsDataType } from './lib/types';
import { EXCLUDED_BRAND } from './lib/constant';
import { compareDataAndAssets } from './compareDataAndAssets';
export const prisma: PrismaClient = new PrismaClient();

// それぞれの通貨で現保有数量をいくらのレート以上で売れば利回りか（売値の最低価格）確認する
export async function calcMinTradeRate() {
  // 事前に現保有数量とDBでデータ違いチェックをし、違う通貨があるか確認
  const compareNgResult = (await compareDataAndAssets()).ng.map((data) => data.split(' ')[0].replaceAll("'", ''));

  // 現保有数量取得
  const assetsData = ((await getAssets()).data as AssetsDataType[]).reduce(
    (previousValue, currentValue) => {
      return { ...previousValue, [currentValue.symbol]: currentValue.amount };
    },
    {} as { [key: string]: string }
  );

  // 通貨ごとの掛け金額を取得
  const registeredAmount = await prisma.now_yen_bet.findMany({
    select: {
      brand: true,
      yen_bet: true
    },
    where: {
      brand: {
        not: EXCLUDED_BRAND
      }
    }
  });

  // それぞれの通貨において売値の最低価格を計算する。DBとのデータ違いがある場合は-1を返す
  const result = registeredAmount
    .filter((data) => data.brand in assetsData)
    .reduce<Record<string, number>>((acc, { brand, yen_bet }) => {
      acc[brand] = compareNgResult.includes(brand) ? -1 : yen_bet / +assetsData[brand];
      return acc;
    }, {});
  return result;
}

calcMinTradeRate();
