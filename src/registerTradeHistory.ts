import * as fs from "fs";
import * as path from "path";
import { readFile } from "fs/promises";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { TRANSACTION_MAX_WAIT, TRANSACTION_TIMEOUT } from "./lib/constant";
export const prisma: PrismaClient = new PrismaClient();

dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * 取引履歴データファイルを読み込んでDBに登録する
 * ファイルの形式はCSV
 * 23列ならgmo用と認識
 * ファイル名にコインチェックとあればcoincheck用と認識する
 * ※仕様上最初の１行はヘッダ行として取り除かれる
 *
 * 実行方法は
 * npx ts-node src/registerTradeHistory.ts （入力ファイルのパス）
 */

// Lambda version
type ServiceFlag = "GMO" | "COINCHECK" | "RAKUTEN";
export const registerDataByLambda = async (
  data: any[],
  serviceFlag?: ServiceFlag
): Promise<number> => {
  if (serviceFlag === "GMO") {
    // GMOデータの場合23列のため
    return await registerGMOData(data);
  } else if (serviceFlag === "COINCHECK") {
    // coincheck用
    return await registerCoinCheckData(data);
  } else if (serviceFlag === "RAKUTEN") {
    // Rakuten用
    return await registerRakutenData(data);
  } else {
    throw new Error("CSVファイルのデータ形式が未対応です");
  }
};

// GMOデータを読み込んでDBに登録する
export const registerGMOData = async (data: any[]): Promise<number> => {
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
            "﻿日時": trade_date, // BOM付き
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
        maxWait: TRANSACTION_MAX_WAIT, // default: 2000
        timeout: TRANSACTION_TIMEOUT, // default: 5000
      }
    );
    return data.length - passed;
  } catch (error) {
    console.error("ファイルの読み込みに・登録に失敗しました:", error);
    return 0;
  }
};

// Coincheckデータを読み込んでDBに登録する
export const registerCoinCheckData = async (data: any[]): Promise<number> => {
  try {
    let passed = 0;
    // 現在登録されているデータで最後の日時を取得（その日時以前のデータはスキップする
    let latestRegisteredDate = (
      await prisma.tradeHistoryCoinCheck.findFirst({
        select: {
          trade_date: true,
        },
        orderBy: {
          trade_date: "desc",
        },
      })
    )?.trade_date;
    if (!latestRegisteredDate) {
      latestRegisteredDate = new Date("2000-01-01T00:00:00.000Z"); // 十分古い日付
    }
    await prisma.$transaction(
      async (prisma) => {
        for (let i = 0; i < data.length; i++) {
          const {
            "﻿取引日時": trade_date, //BOM設定
            取引種別: trade_type,
            取引形態: trade_method,
            通貨ペア: currency_pair,
            増加通貨名: increase_currency,
            増加数量: increase_amount,
            減少通貨名: decrease_currency,
            減少数量: decrease_amount,
            約定代金: executed_value,
            約定価格: executed_price,
            手数料通貨: fee_currency,
            手数料数量: fee_amount,
            送付元アドレス: from_address,
            送付先アドレス: to_address,
            登録番号: registration_number,
            社名: company_name,
            備考: remarks,
          } = data[i];
          if (!data[i]["﻿取引日時"] || data[i]["﻿取引日時"] === "") {
            //空行または１列目(取引日時)が空欄ならパス
            passed++;
            continue;
          }
          if (
            latestRegisteredDate &&
            new Date(trade_date) <= latestRegisteredDate
          ) {
            // DBにある最新の日時よりも前 -> すでに登録済みとみなし、スキップ
            passed++;
            continue;
          }
          // データ登録
          await prisma.tradeHistoryCoinCheck.create({
            data: {
              trade_date: new Date(trade_date),
              trade_type,
              trade_method,
              currency_pair,
              increase_currency,
              increase_amount: +increase_amount,
              decrease_currency,
              decrease_amount: +decrease_amount,
              executed_value: +executed_value,
              executed_price: +executed_price,
              fee_currency,
              fee_amount: +fee_amount,
              from_address,
              to_address,
              registration_number,
              company_name,
              remarks,
            },
          });
        }
      },
      {
        maxWait: TRANSACTION_MAX_WAIT, // default: 2000
        timeout: TRANSACTION_TIMEOUT, // default: 5000
      }
    );
    return data.length - passed;
  } catch (error) {
    console.error("ファイルの読み込みに・登録に失敗しました:", error);
    return 0;
  }
};

// Rakutenデータを読み込んでDBに登録する
export const registerRakutenData = async (data: any[]): Promise<number> => {
  try {
    let passed = 0;
    // 現在登録されているデータで最後の日時を取得（その日時以前のデータはスキップする
    let latestRegisteredDate = (
      await prisma.tradeHistoryRakuten.findFirst({
        select: {
          trade_date: true,
        },
        orderBy: {
          trade_date: "desc",
        },
      })
    )?.trade_date;
    if (!latestRegisteredDate) {
      latestRegisteredDate = new Date("2000-01-01T00:00:00.000Z"); // 十分古い日付
    }
    console.log("data.length:",data.length)
    console.log("latestRegisteredDate:",latestRegisteredDate)
    await prisma.$transaction(
      async (prisma) => {
        for (let i = 0; i < data.length; i++) {
          const {
            "﻿取引年月日": trade_date, //BOM設定
            取引種別: trade_type,
            取引形態: trade_method,
            通貨ペア: currency_pair,
            増加通貨名: increase_currency,
            増加数量: increase_amount,
            減少通貨名: decrease_currency,
            減少数量: decrease_amount,
            約定価格: execution_price,
            単価: unit_price,
            手数料通貨: fee_currency,
            手数料数量: fee_amount,
            備考: remarks,
          } = data[i];
          if (
            latestRegisteredDate &&
            new Date(trade_date) <= latestRegisteredDate
          ) {
            // DBにある最新の日時よりも前 -> すでに登録済みとみなし、スキップ
            passed++;
            continue;
          }
          // データ登録
          await prisma.tradeHistoryRakuten.create({
            data: {
              trade_date: new Date(trade_date),
              trade_type,
              trade_method,
              currency_pair,
              increase_currency,
              increase_amount: +increase_amount,
              decrease_currency,
              decrease_amount: +decrease_amount,
              execution_price: +execution_price,
              unit_price: +unit_price,
              fee_currency,
              fee_amount: +fee_amount,
              remarks,
            },
          });
        }
      },
      {
        maxWait: TRANSACTION_MAX_WAIT, // default: 2000
        timeout: TRANSACTION_TIMEOUT, // default: 5000
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
