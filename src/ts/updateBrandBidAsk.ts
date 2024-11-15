import "dotenv/config";
import { PrismaClient } from "@prisma/client";
export const prisma: PrismaClient = new PrismaClient();

/**
 * 銘柄・売買・値を読み取ってテーブルに登録する
 *
 * 実行方法は
 * npx ts-node src/updateBrandBidAsk.ts 銘柄名 bidかask 値(数値)
 */

// 引数チェック
if (process.argv.length !== 5) {
  console.error(
    `Error: Usage: npx ts-node src/updateBrandBidAsk.ts brand bid/ask (value). not (${process.argv})`
  );
  process.exit(1);
}

const brand = process.argv[2];
const bidAsk = process.argv[3];
const value = process.argv[4];

// 引数チェック
if (bidAsk !== "bid" && bidAsk !== "ask") {
  console.error("Error: bidAsk must be 'bid' or 'ask'. not " + bidAsk);
  process.exit(1);
}

// ファイル読み込み・解析
(async function updateBidAsk() {
  try {
    await prisma.brandBidAsk.upsert({
      where: {
        brand: brand.toUpperCase(),
      },
      update: {
        ...(bidAsk === "bid"
          ? {
              bid_price: +value,
              bid_updated_time: new Date(),
            }
          : {
              ask_price: +value,
              ask_updated_time: new Date(),
            }),
      },
      create: {
        brand: brand.toUpperCase(),
        ...(bidAsk === "bid"
          ? {
              bid_price: +value,
              ask_price: null,
              bid_updated_time: new Date(),
              ask_updated_time: null,
            }
          : {
              bid_price: null,
              ask_price: +value,
              bid_updated_time: null,
              ask_updated_time: new Date(),
            }),
      },
    });
  } catch (error) {
    console.error("データの登録に失敗しました:", error);
  }
})();
