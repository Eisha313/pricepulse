'use client';

import useSWR from 'swr';

interface PricePoint {
  id: string;
  price: number;
  checkedAt: string;
}

interface UsePriceHistoryResult {
  priceHistory: PricePoint[];
  isLoading: boolean;
  error: Error | null;
  minPrice: number | null;
  maxPrice: number | null;
  averagePrice: number | null;
  priceChange: { value: number; percentage: number } | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('Failed to fetch price history');
    throw error;
  }
  return res.json();
};

export function usePriceHistory(productId: string | null): UsePriceHistoryResult {
  const { data, error, isLoading } = useSWR<PricePoint[]>(
    productId ? `/api/products/${productId}/price-history` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  const priceHistory = data || [];

  // Calculate statistics with null safety
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let averagePrice: number | null = null;
  let priceChange: { value: number; percentage: number } | null = null;

  if (priceHistory.length > 0) {
    const prices = priceHistory
      .map(p => p.price)
      .filter((price): price is number => 
        typeof price === 'number' && !isNaN(price) && price > 0
      );

    if (prices.length > 0) {
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
      averagePrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

      if (prices.length >= 2) {
        const oldestPrice = prices[0];
        const newestPrice = prices[prices.length - 1];
        const changeValue = newestPrice - oldestPrice;
        const changePercentage = oldestPrice > 0 
          ? Math.round((changeValue / oldestPrice) * 10000) / 100
          : 0;
        
        priceChange = {
          value: Math.round(changeValue * 100) / 100,
          percentage: changePercentage,
        };
      }
    }
  }

  return {
    priceHistory,
    isLoading,
    error: error || null,
    minPrice,
    maxPrice,
    averagePrice,
    priceChange,
  };
}
