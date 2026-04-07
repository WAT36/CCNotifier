/**
 *
 * 実行方法:
 *   npx tsx scripts/getGmtMinPrice.ts
 */

import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.ORDER_LIST_API_URL;
if (!API_URL) {
  console.error('環境変数 ORDER_LIST_API_URL が設定されていません。.env を確認してください。');
  process.exit(1);
}

interface OrderItem {
  sellPrice?: number;
  [key: string]: unknown;
}

interface OrderListResponse {
  code?: number;
  msg?: string;
  data?: OrderItem[] | { list?: OrderItem[]; [key: string]: unknown };
}

async function fetchMinGmtPrice(): Promise<void> {
  const response = await axios.get<OrderListResponse>(API_URL || '');
  const body = response.data;

  if (body.code !== undefined && body.code !== 0) {
    console.error(`APIエラー (code=${body.code}): ${body.msg ?? '不明'}`);
    process.exit(1);
  }

  // data が配列の場合と {list: [...]} の場合に対応
  const raw = body.data;
  const items: OrderItem[] = Array.isArray(raw) ? raw : (raw?.list ?? []);

  if (items.length === 0) {
    console.error('データが空です。');
    process.exit(1);
  }

  const prices = items.map((item) => item.sellPrice).filter((p): p is number => typeof p === 'number' && p > 0);

  if (prices.length === 0) {
    console.error('sellPrice フィールドが見つかりませんでした。');
    process.exit(1);
  }

  const minPrice = Math.min(...prices) / 100;
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  console.log(`[${now}] GMT最安値: ${minPrice}`);
}

fetchMinGmtPrice().catch((err: unknown) => {
  console.error('エラーが発生しました:', err);
  process.exit(1);
});
