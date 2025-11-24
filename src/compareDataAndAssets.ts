import { getAssets } from "./getAssets";
import { PrismaClient } from "@prisma/client";
import {
  EXCLUDED_BRAND,
  ASSETS_COMPARISON_TOLERANCE,
  ASSETS_DECIMAL_PLACES,
} from "./lib/constant";
export const prisma: PrismaClient = new PrismaClient();

/**
 * DBにある現保有資産と資産取得APIの結果を比較し、違う場合はアラートを出す
 *
 * 実行方法は
 * npx ts-node src/compareDataAndAssets.ts
 */

type assetsDataType = {
  amount: string;
  available: string;
  conversionRate: string;
  symbol: string;
};

export async function compareDataAndAssets() {
  const assetsData = ((await getAssets()).data as assetsDataType[]).reduce(
    (previousValue, currentValue) => {
      return { ...previousValue, [currentValue.symbol]: currentValue.amount };
    },
    {} as { [key: string]: string }
  );

  const registeredAmount = (
    await prisma.now_amount.findMany({
      select: {
        brand: true,
        now_amount: true,
      },
      where: {
        brand: {
          not: EXCLUDED_BRAND,
        },
      },
    })
  ).reduce((previousValue, currentValue) => {
    return {
      ...previousValue,
      [currentValue.brand]: String(
        currentValue.now_amount.toDP(ASSETS_DECIMAL_PLACES)
      ),
    };
  }, {} as { [key: string]: string });

  const result = {
    ok: [] as string[],
    ng: [] as string[],
  };
  for (let key in assetsData) {
    let message = "";
    // assetsData[key]・registeredAmount[key]ともに小数点以下8桁までの誤差は許容する
    if (
      key in registeredAmount &&
      Math.abs(Number(assetsData[key]) - Number(registeredAmount[key])) >
        ASSETS_COMPARISON_TOLERANCE
    ) {
      message = `'${key}' is wrong\tnow:${assetsData[key]},\tDB:${registeredAmount[key]}`;
      result.ng.push(message);
    } else if (
      key in registeredAmount &&
      assetsData[key] === registeredAmount[key]
    ) {
      message = `'${key}' is OK.\t(${assetsData[key]})`;
      result.ok.push(message);
    }
  }

  return result;
}

compareDataAndAssets();
