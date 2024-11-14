import { getAssets } from "./getAssets";
import { PrismaClient } from "@prisma/client";
export const prisma: PrismaClient = new PrismaClient();

type assetsDataType = {
  amount: string;
  available: string;
  conversionRate: string;
  symbol: string;
};

(async function compareDataAndAssets() {
  const assetsData = ((await getAssets()).data as assetsDataType[]).reduce(
    (previousValue, currentValue) => {
      return { ...previousValue, [currentValue.symbol]: +currentValue.amount };
    },
    {} as { [key: string]: number }
  );
  //console.log(assetsData);

  const registeredAmount = (
    await prisma.now_bet.findMany({
      select: {
        brand: true,
        now_amount: true,
      },
      where: {
        brand: {
          not: "JPY",
        },
      },
    })
  ).reduce((previousValue, currentValue) => {
    return { ...previousValue, [currentValue.brand]: currentValue.now_amount };
  }, {} as { [key: string]: number });
  //console.log(registeredAmount);

  for (let key in assetsData) {
    if (key in registeredAmount && assetsData[key] !== registeredAmount[key]) {
      console.log(
        `'${key}' is wrong\tnow:${assetsData[key]},\tDB:${registeredAmount[key]}`
      );
    } else if (
      key in registeredAmount &&
      assetsData[key] === registeredAmount[key]
    ) {
      console.log(`'${key}' is OK.\t(${assetsData[key]})`);
    }
  }
})();
