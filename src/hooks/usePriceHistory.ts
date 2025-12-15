import useSWR from 'swr';
import { useMemo } from 'react';

interface PricePoint {
  id: string;
  price: number;
  currency: string;
  createdAt: string;
}

interface PriceHistoryResponse {
  priceHistory: PricePoint[];
  productId: string;
  productName: string;
}

interface UsePriceHistoryOptions {
  days?: number;
  enabled?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('Failed to fetch price history');
    const data = await res.json().catch(() => ({}));
    (error as any).info = data;
    (error as any).status = res.status;
    throw error;
  }
  
  return res.json();
};

export function usePriceHistory(productId: string | null, options: UsePriceHistoryOptions = {}) {
  const { days = 30, enabled = true } = options;
  
  const shouldFetch = enabled && productId;

  const { data, error, isLoading, isValidating, mutate } = useSWR<PriceHistoryResponse>(
    shouldFetch ? `/api/products/${productId}/price-history?days=${days}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 2,
      errorRetryInterval: 2000,
    }
  );

  const chartData = useMemo(() => {
    if (!data?.priceHistory) return [];
    
    return data.priceHistory.map((point) => ({
      date: new Date(point.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      timestamp: new Date(point.createdAt).getTime(),
      price: point.price,
      currency: point.currency,
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [data?.priceHistory]);

  const stats = useMemo(() => {
    if (!data?.priceHistory?.length) {
      return {
        currentPrice: null,
        lowestPrice: null,
        highestPrice: null,
        averagePrice: null,
        priceChange: null,
        priceChangePercent: null,
      };
    }

    const prices = data.priceHistory.map((p) => p.price);
    const sortedByDate = [...data.priceHistory].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const currentPrice = sortedByDate[0]?.price ?? null;
    const previousPrice = sortedByDate[1]?.price ?? null;
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    
    let priceChange = null;
    let priceChangePercent = null;
    
    if (currentPrice !== null && previousPrice !== null) {
      priceChange = currentPrice - previousPrice;
      priceChangePercent = ((priceChange / previousPrice) * 100);
    }

    return {
      currentPrice,
      lowestPrice,
      highestPrice,
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceChange: priceChange !== null ? Math.round(priceChange * 100) / 100 : null,
      priceChangePercent: priceChangePercent !== null ? Math.round(priceChangePercent * 100) / 100 : null,
    };
  }, [data?.priceHistory]);

  return {
    priceHistory: data?.priceHistory ?? [],
    productName: data?.productName ?? null,
    chartData,
    stats,
    isLoading,
    isValidating,
    error: error?.message || null,
    refresh: mutate,
    isEmpty: !isLoading && !error && chartData.length === 0,
  };
}

export type { PricePoint, PriceHistoryResponse, UsePriceHistoryOptions };