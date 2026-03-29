import { prisma } from '../allUpdateShopRate';
import type { PriceBar } from './types';

export async function loadPriceBarsForBrand(brandUpper: string, since: Date): Promise<PriceBar[]> {
  const rows = await prisma.priceRateHistory.findMany({
    where: {
      brand: brandUpper,
      created_time: { gte: since },
      ask_price: { not: null }
    },
    orderBy: { created_time: 'asc' },
    select: { ask_price: true, created_time: true }
  });

  const bars: PriceBar[] = [];
  for (const r of rows) {
    if (r.created_time && r.ask_price != null) {
      const ask = r.ask_price.toNumber();
      if (Number.isFinite(ask) && ask > 0) {
        bars.push({ time: r.created_time, ask });
      }
    }
  }
  return bars;
}
