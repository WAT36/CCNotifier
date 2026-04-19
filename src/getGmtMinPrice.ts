/**
 *
 * 実行方法:
 *   npx tsx src/getGmtMinPrice.ts
 */

import * as dotenv from 'dotenv';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

dotenv.config();

interface OrderItem {
  sellPrice?: number;
  [key: string]: unknown;
}

interface OrderListResponse {
  code?: number;
  msg?: string;
  data?: OrderItem[] | { list?: OrderItem[]; [key: string]: unknown };
}

export async function fetchMinGmtPrice(chain: string): Promise<number> {
  if (!chain) {
    throw new Error('引数 chain が空です。3桁のチェーンIDを指定してください。');
  }

  const baseUrl = process.env.ORDER_LIST_API_URL;
  if (!baseUrl) {
    throw new Error('環境変数 ORDER_LIST_API_URL が設定されていません。.env を確認してください。');
  }

  const apiUrl = `${baseUrl}${chain}`;
  const response = await axios.get<OrderListResponse>(apiUrl);
  const body = response.data;

  if (body.code !== undefined && body.code !== 0) {
    throw new Error(`APIエラー (code=${body.code}): ${body.msg ?? '不明'}`);
  }

  const raw = body.data;
  const items: OrderItem[] = Array.isArray(raw) ? raw : (raw?.list ?? []);

  if (items.length === 0) {
    throw new Error('データが空です。');
  }

  const prices = items
    .map((item) => item.sellPrice)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  if (prices.length === 0) {
    throw new Error('sellPrice フィールドが見つかりませんでした。');
  }

  const minPrice = Math.min(...prices) / 100;

  await prisma.sneakerRateHistory.create({
    data: {
      brand: chain,
      sneaker_rate: minPrice,
      created_time: new Date()
    }
  });

  return minPrice;
}

/**
 * sneakerRateHistory テーブルに記録されている、指定チェーンの歴代最安値を返す。
 * レコードが存在しない場合は null を返す。
 */
export async function fetchRecordMinGmtPrice(chain: string): Promise<number | null> {
  const result = await prisma.sneakerRateHistory.aggregate({
    where: { brand: chain },
    _min: { sneaker_rate: true }
  });
  const min = result._min.sneaker_rate;
  return min !== null ? Number(min) : null;
}

// このファイルを直接実行した場合のみ動作する
if (require.main === module) {
  const chain = process.argv[2] ?? '';
  fetchMinGmtPrice(chain)
    .then((minPrice) => {
      const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      console.log(`[${now}] GMT最安値: ${minPrice}`);
    })
    .catch((err: unknown) => {
      console.error('エラーが発生しました:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
