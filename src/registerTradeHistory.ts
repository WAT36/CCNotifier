import * as fs from "fs";
import * as path from "path";
import { readFile } from "fs/promises";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
export const prisma: PrismaClient = new PrismaClient();

/**
 * 取引履歴データファイルを読み込んでDBに登録する
 * ファイルの形式はCSVで以下の定義とする
 * 日時,精算区分,日本円受渡金額,注文ID,約定ID,建玉ID,銘柄名,注文タイプ,取引区分,売買区分,執行条件,約定数量,約定レート,約定金額,注文手数料,レバレッジ手数料,入出金区分,入出金金額,授受区分,数量,送付手数料,送付先/送付元,トランザクションID
 * ※ヘッダ行は取り除いておくこと
 *
 * 実行方法は
 * npx ts-node src/registerTradeHistory.ts （入力ファイルのパス）
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
      for (let i = 0; i < line.length; i++) {
        if (i === 0) {
          continue;
        }
        const l = line[i];
        const item = l.split(",");
        const [
          trade_date,
          settlement_category,
          yen_payment,
          order_id,
          contract_id,
          position_id,
          brand,
          order_type,
          trade_category,
          buysell_category,
          ioc_category,
          contract_amount,
          contract_rate,
          contract_payment,
          order_commission,
          leverage_commission,
          deposit_withdrawal_category,
          deposit_withdrawal_amount,
          givetake_category,
          givetake_amount,
          sending_commission,
          sender,
          transaction_id,
        ] = item;
        // データ登録
        await prisma.tradeHistory.create({
          data: {
            trade_date: new Date(trade_date),
            settlement_category,
            yen_payment: +yen_payment,
            order_id,
            contract_id,
            position_id,
            brand,
            order_type,
            trade_category,
            buysell_category,
            ioc_category,
            contract_amount: +contract_amount,
            contract_rate: +contract_rate,
            contract_payment: +contract_payment,
            order_commission: +order_commission,
            leverage_commission: +leverage_commission,
            deposit_withdrawal_category,
            deposit_withdrawal_amount: +deposit_withdrawal_amount,
            givetake_category,
            givetake_amount: +givetake_amount,
            sending_commission: +sending_commission,
            sender,
            transaction_id,
          },
        });
      }
    });
    console.log(`${line.length} data registered!!`);
  } catch (error) {
    console.error("ファイルの読み込みに・登録に失敗しました:", error);
  }
})();
