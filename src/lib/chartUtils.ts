import { format, subDays, subMonths, startOfDay } from 'date-fns';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ChartDataPoint {
  date: string;
  price: number;
  formattedDate: string;
  formattedPrice: string;
}

export interface PriceHistoryEntry {
  id: string;
  price: number;
  createdAt: Date | string;
}

export function filterByTimeRange<T extends { createdAt: Date | string }>(
  data: T[],
  range: TimeRange
): T[] {
  if (range === 'all') return data;

  const now = new Date();
  let startDate: Date;

  switch (range) {
    case '7d':
      startDate = subDays(now, 7);
      break;
    case '30d':
      startDate = subDays(now, 30);
      break;
    case '90d':
      startDate = subDays(now, 90);
      break;
    case '1y':
      startDate = subMonths(now, 12);
      break;
    default:
      return data;
  }

  return data.filter((item) => {
    const itemDate = new Date(item.createdAt);
    return itemDate >= startDate;
  });
}

export function formatChartData(
  priceHistory: PriceHistoryEntry[],
  currency: string = 'USD'
): ChartDataPoint[] {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  return priceHistory.map((entry) => {
    const date = new Date(entry.createdAt);
    return {
      date: date.toISOString(),
      price: entry.price,
      formattedDate: format(date, 'MMM d, yyyy'),
      formattedPrice: formatter.format(entry.price),
    };
  });
}

export function aggregateDailyPrices(
  priceHistory: PriceHistoryEntry[]
): PriceHistoryEntry[] {
  const dailyMap = new Map<string, PriceHistoryEntry>();

  priceHistory.forEach((entry) => {
    const dateKey = startOfDay(new Date(entry.createdAt)).toISOString();
    const existing = dailyMap.get(dateKey);

    if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
      dailyMap.set(dateKey, entry);
    }
  });

  return Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function calculatePriceStats(priceHistory: PriceHistoryEntry[]): {
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  priceChange: number;
  priceChangePercent: number;
} {
  if (priceHistory.length === 0) {
    return {
      currentPrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      averagePrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
    };
  }

  const prices = priceHistory.map((entry) => entry.price);
  const currentPrice = prices[prices.length - 1];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  const firstPrice = prices[0];
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  return {
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice: Math.round(averagePrice * 100) / 100,
    priceChange: Math.round(priceChange * 100) / 100,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100,
  };
}

export function getChartColors(theme: 'light' | 'dark' = 'light') {
  return {
    primary: theme === 'light' ? '#3b82f6' : '#60a5fa',
    secondary: theme === 'light' ? '#10b981' : '#34d399',
    danger: theme === 'light' ? '#ef4444' : '#f87171',
    grid: theme === 'light' ? '#e5e7eb' : '#374151',
    text: theme === 'light' ? '#374151' : '#d1d5db',
    background: theme === 'light' ? '#ffffff' : '#1f2937',
  };
}

export function formatAxisLabel(value: number, type: 'price' | 'date'): string {
  if (type === 'price') {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  }
  return value.toString();
}

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
];
