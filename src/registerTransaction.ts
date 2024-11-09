import * as fs from "fs";
import * as path from "path";
import { readFile } from "fs/promises";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
export const prisma: PrismaClient = new PrismaClient();

/**
 * 取引履歴データファイルを読み込んでDBに登録する
 * ファイルの形式はTSVで以下の定義とする
 * 売買日時	銘柄名	売買区分	約定数量	約定レート	約定代金	約定ID
 * 例
 * 2024/03/02 11:11:47	ETH	買	0.01701744 ETH	528,869 円	9,000 円	891129837
 *
 * 実行方法は
 * npx ts-node src/registerTransaction.ts （入力ファイルのパス）
 */

// 引数チェック
if (process.argv.length !== 3) {
  console.error(
    "Error: Usage: npx ts-node src/quiz.uploader.ts (Input file name)"
  );
  process.exit(1);
}

//  ファイル存在チェック
const inputFilePath = "../" + process.argv[2];
try {
  // TODO csvファイルパス指定　もっとわかりやすい方法、、
  fs.statSync(path.resolve(__dirname, inputFilePath));
} catch (err) {
  throw err;
}

// ファイル読み込み・解析
(async function registerData() {
  try {
    const data: string = await readFile(
      path.resolve(__dirname, inputFilePath),
      "utf8"
    );
    const line = data.split(/\n/);
    await prisma.$transaction(async (prisma) => {
      for (const l of line) {
        const item = l.split(/\t/);
        const [transaction_date, brand, buysell, amount, rate, payment, id] =
          item;
        await prisma.transaction.create({
          data: {
            id,
            brand,
            buysell,
            amount: +amount.split(" ")[0].replaceAll(",", ""),
            rate: parseFloat(rate.split(" ")[0].replaceAll(",", "")),
            payment: +payment.split(" ")[0].replaceAll(",", ""),
            transaction_date: new Date(transaction_date),
          },
        });
      }
    });
    console.log(`${line.length} data registered!!`);
  } catch (error) {
    console.error("ファイルの読み込みに・登録に失敗しました:", error);
  }
})();
