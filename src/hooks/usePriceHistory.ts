import { useState, useEffect, useCallback } from 'react';
import { PriceHistoryEntry, calculatePriceStats } from '@/lib/chartUtils';

interface UsePriceHistoryOptions {
  productId: string;
  enabled?: boolean;
  refetchInterval?: number;
}

interface UsePriceHistoryReturn {
  priceHistory: PriceHistoryEntry[];
  stats: ReturnType<typeof calculatePriceStats>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePriceHistory({
  productId,
  enabled = true,
  refetchInterval,
}: UsePriceHistoryOptions): UsePriceHistoryReturn {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPriceHistory = useCallback(async () => {
    if (!productId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${productId}/price-history`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch price history');
      }

      const data = await response.json();
      setPriceHistory(data.priceHistory || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching price history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, enabled]);

  useEffect(() => {
    fetchPriceHistory();
  }, [fetchPriceHistory]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(fetchPriceHistory, refetchInterval);
    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchPriceHistory]);

  const stats = calculatePriceStats(priceHistory);

  return {
    priceHistory,
    stats,
    isLoading,
    error,
    refetch: fetchPriceHistory,
  };
}

export default usePriceHistory;
