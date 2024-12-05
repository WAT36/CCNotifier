import { checkSellTime } from "./checkSellTime";

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

checkSellTime(brand);
