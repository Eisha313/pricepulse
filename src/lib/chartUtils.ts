import { PriceHistoryEntry } from '@/types';

export interface ChartDataPoint {
  date: string;
  price: number;
  formattedDate: string;
  formattedPrice: string;
}

export function formatPriceForChart(price: number | null | undefined): number {
  if (price === null || price === undefined || isNaN(price)) {
    return 0;
  }
  return Number(price);
}

export function transformPriceHistory(history: PriceHistoryEntry[]): ChartDataPoint[] {
  if (!history || !Array.isArray(history)) {
    return [];
  }

  return history
    .filter(entry => entry && entry.price !== null && entry.price !== undefined)
    .map(entry => {
      const price = formatPriceForChart(entry.price);
      const date = new Date(entry.createdAt);
      
      return {
        date: date.toISOString(),
        price,
        formattedDate: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        formattedPrice: formatCurrency(price),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function calculatePriceChange(
  currentPrice: number | null | undefined,
  previousPrice: number | null | undefined
): { change: number; percentage: number; direction: 'up' | 'down' | 'unchanged' } {
  const current = formatPriceForChart(currentPrice);
  const previous = formatPriceForChart(previousPrice);
  
  if (previous === 0) {
    return { change: 0, percentage: 0, direction: 'unchanged' };
  }
  
  const change = current - previous;
  const percentage = (change / previous) * 100;
  
  let direction: 'up' | 'down' | 'unchanged' = 'unchanged';
  if (change > 0.01) direction = 'up';
  else if (change < -0.01) direction = 'down';
  
  return {
    change: Math.abs(change),
    percentage: Math.abs(percentage),
    direction,
  };
}

export function getChartDomain(data: ChartDataPoint[]): [number, number] {
  if (!data || data.length === 0) {
    return [0, 100];
  }
  
  const prices = data.map(d => d.price).filter(p => p > 0);
  
  if (prices.length === 0) {
    return [0, 100];
  }
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Add 10% padding to the domain
  const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.1;
  
  return [
    Math.max(0, minPrice - padding),
    maxPrice + padding,
  ];
}

export function generateChartTicks(domain: [number, number], tickCount: number = 5): number[] {
  const [min, max] = domain;
  const step = (max - min) / (tickCount - 1);
  
  return Array.from({ length: tickCount }, (_, i) => 
    Math.round((min + step * i) * 100) / 100
  );
}
