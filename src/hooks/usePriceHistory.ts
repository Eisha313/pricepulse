import useSWR from 'swr';

interface PriceHistoryEntry {
  id: string;
  price: number;
  checkedAt: string;
}

interface UsePriceHistoryOptions {
  productId: string;
  days?: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch price history');
  }
  return res.json();
};

export function usePriceHistory({ productId, days = 30 }: UsePriceHistoryOptions) {
  const { data, error, isLoading, mutate } = useSWR<PriceHistoryEntry[]>(
    productId ? `/api/products/${productId}/history?days=${days}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    history: data || [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

export function usePriceStats(productId: string) {
  const { history, isLoading, isError } = usePriceHistory({ productId, days: 90 });

  const stats = {
    currentPrice: history[history.length - 1]?.price || 0,
    lowestPrice: Math.min(...history.map((h) => h.price)) || 0,
    highestPrice: Math.max(...history.map((h) => h.price)) || 0,
    averagePrice: history.length
      ? history.reduce((sum, h) => sum + h.price, 0) / history.length
      : 0,
    priceChange: history.length >= 2
      ? history[history.length - 1].price - history[0].price
      : 0,
    priceChangePercent: history.length >= 2
      ? ((history[history.length - 1].price - history[0].price) / history[0].price) * 100
      : 0,
  };

  return {
    stats,
    isLoading,
    isError,
  };
}