import * as fs from "fs";
import * as path from "path";
import { readFile } from "fs/promises";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
export const prisma: PrismaClient = new PrismaClient();

dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * 取引履歴データファイルを読み込んでDBに登録する
 * ファイルの形式はCSVで以下の定義とする
 * 日時,精算区分,日本円受渡金額,注文ID,約定ID,建玉ID,銘柄名,注文タイプ,取引区分,売買区分,執行条件,約定数量,約定レート,約定金額,注文手数料,レバレッジ手数料,入出金区分,入出金金額,授受区分,数量,送付手数料,送付先/送付元,トランザクションID
 * ※最初の１行はヘッダ行として取り除かれる
 *
 * 実行方法は
 * npx ts-node src/registerTradeHistory.ts （入力ファイルのパス）
 */

// Lambda version
export const registerDataByLambda = async (data: any[]): Promise<number> => {
  try {
    let passed = 0;

    // 現在登録されているデータで最後の日時を取得（その日時以前のデータはスキップする
    const latestRegisteredDate = (
      await prisma.tradeHistory.findFirst({
        select: {
          trade_date: true,
        },
        orderBy: {
          trade_date: "desc",
        },
      })
    )?.trade_date;

    await prisma.$transaction(
      async (prisma) => {
        for (let i = 0; i < data.length; i++) {
          if (!data[i]) {
            //空行ならパス
            passed++;
            continue;
          }
          const {
            "﻿日時": trade_date,
            精算区分: settlement_category,
            日本円受渡金額: yen_payment,
            注文ID: order_id,
            約定ID: contract_id,
            建玉ID: position_id,
            銘柄名: brand,
            注文タイプ: order_type,
            取引区分: trade_category,
            売買区分: buysell_category,
            執行条件: ioc_category,
            約定数量: contract_amount,
            約定レート: contract_rate,
            約定金額: contract_payment,
            注文手数料: order_commission,
            レバレッジ手数料: leverage_commission,
            入出金区分: deposit_withdrawal_category,
            入出金金額: deposit_withdrawal_amount,
            授受区分: givetake_category,
            数量: givetake_amount,
            送付手数料: sending_commission,
            "送付先/送付元": sender,
            トランザクションID: transaction_id,
          } = data[i];
          console.log(i, trade_date);
          if (
            latestRegisteredDate &&
            new Date(trade_date) <= latestRegisteredDate
          ) {
            // DBにある最新の日時よりも前 -> すでに登録済みとみなし、スキップ
            passed++;
            continue;
          }

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
      },
      {
        maxWait: 10000, // default: 2000
        timeout: 20000, // default: 5000
      }
    );
    return data.length - passed;
  } catch (error) {
    console.error("ファイルの読み込みに・登録に失敗しました:", error);
    return 0;
  }
};

// 引数チェック
if (process.argv[1] === __filename) {
  // 引数チェック
  if (process.argv.length !== 3) {
    console.error(
      "Error: Usage: npx ts-node src/registerTradeHistory.ts (Input file name)"
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
      let passed = 0;
      const line = data.split(/\n/);

      // 現在登録されているデータで最後の日時を取得（その日時以前のデータはスキップする
      const latestRegisteredDate = (
        await prisma.tradeHistory.findFirst({
          select: {
            trade_date: true,
          },
          orderBy: {
            trade_date: "desc",
          },
        })
      )?.trade_date;

      await prisma.$transaction(
        async (prisma) => {
          for (let i = 0; i < line.length; i++) {
            if (i === 0) {
              passed++;
              continue;
            }
            const l = line[i];
            if (!l || l === "") {
              //空行ならパス
              passed++;
              continue;
            }
            const item = l.split(",");
            if (
              latestRegisteredDate &&
              new Date(item[0]) <= latestRegisteredDate
            ) {
              // DBにある最新の日時よりも前 -> すでに登録済みとみなし、スキップ
              passed++;
              continue;
            }
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
        },
        {
          maxWait: 10000, // default: 2000
          timeout: 20000, // default: 5000
        }
      );
      console.log(`${line.length - passed} data registered!!`);
    } catch (error) {
      console.error("ファイルの読み込みに・登録に失敗しました:", error);
    }
  })();
}
