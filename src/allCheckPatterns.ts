import { PrismaClient } from '@prisma/client';
import { BRANDS } from './config';
import { detectPatterns, DetectedPattern } from './patternDetector';

const prisma = new PrismaClient();

/**
 * 各通貨の直近50レコードの終値を取得し、チャートパターンを検出して
 * Slack 通知用メッセージ一覧を返す
 */
export async function allCheckPatterns(): Promise<string[]> {
  const messages: string[] = [];

  for (const brand of BRANDS) {
    // DBから直近50レコードの終値（bid_price）を取得
    const records = await prisma.priceRateHistory.findMany({
      where: { brand },
      orderBy: { created_time: 'desc' },
      take: 50,
      select: { bid_price: true }
    });

    if (records.length === 0) continue;

    // 古い順に並べ直して number[] に変換
    const prices = records
      .reverse()
      .map((r) => r.bid_price?.toNumber() ?? 0)
      .filter((p) => p > 0);

    // チャートパターンを検出
    const detected = detectPatterns(prices);
    if (detected.length === 0) continue;

    const latestRate = prices[prices.length - 1];
    const message = buildPatternMessage(brand, latestRate, detected);
    messages.push(message);
  }

  return messages;
}

/**
 * 1通貨分の通知メッセージを組み立てる
 * 複数パターン合致した場合は1メッセージにまとめる
 */
function buildPatternMessage(brand: string, latestRate: number, detected: DetectedPattern[]): string {
  // 買いシグナルと売りシグナルに分類
  const buyPatterns = detected.filter((p) => p.signal === 'buy');
  const sellPatterns = detected.filter((p) => p.signal === 'sell');

  const lines: string[] = [];

  if (buyPatterns.length > 0) {
    lines.push(`📈 ${brand.toUpperCase()} 買い時アラート`);
    for (const p of buyPatterns) {
      lines.push(`パターン: ${p.name}（一致率: ${Math.round(p.score * 100)}%）`);
    }
    lines.push(`直近レート: ${latestRate.toLocaleString()}円`);
  }

  if (sellPatterns.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(`📉 ${brand.toUpperCase()} 売り時アラート`);
    for (const p of sellPatterns) {
      lines.push(`パターン: ${p.name}（一致率: ${Math.round(p.score * 100)}%）`);
    }
    lines.push(`直近レート: ${latestRate.toLocaleString()}円`);
  }

  return lines.join('\n');
}
