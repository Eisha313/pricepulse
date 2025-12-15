import useSWR from 'swr';
import { useState, useCallback } from 'react';

interface Alert {
  id: string;
  productId: string;
  targetPrice: number;
  isActive: boolean;
  triggeredAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    currentPrice: number;
    currency: string;
    imageUrl: string | null;
  };
}

interface AlertsResponse {
  alerts: Alert[];
  total: number;
}

interface UseAlertsOptions {
  activeOnly?: boolean;
  productId?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('Failed to fetch alerts');
    const data = await res.json().catch(() => ({}));
    (error as any).info = data;
    (error as any).status = res.status;
    throw error;
  }
  
  return res.json();
};

export function useAlerts(options: UseAlertsOptions = {}) {
  const { activeOnly = false, productId } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const queryParams = new URLSearchParams();
  if (activeOnly) queryParams.set('active', 'true');
  if (productId) queryParams.set('productId', productId);
  
  const queryString = queryParams.toString();
  const url = `/api/alerts${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<AlertsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  const createAlert = useCallback(async (alertData: { productId: string; targetPrice: number }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to create alert');
      }

      await mutate();
      return responseData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create alert';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const updateAlert = useCallback(async (id: string, updates: { targetPrice?: number; isActive?: boolean }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to update alert');
      }

      await mutate();
      return responseData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update alert';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const deleteAlert = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const responseData = await res.json().catch(() => ({}));
        throw new Error(responseData.error || 'Failed to delete alert');
      }

      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete alert';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const toggleAlert = useCallback(async (id: string, currentState: boolean) => {
    return updateAlert(id, { isActive: !currentState });
  }, [updateAlert]);

  const clearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  const activeAlerts = data?.alerts.filter((a) => a.isActive) ?? [];
  const triggeredAlerts = data?.alerts.filter((a) => a.triggeredAt !== null) ?? [];

  return {
    alerts: data?.alerts ?? [],
    activeAlerts,
    triggeredAlerts,
    total: data?.total ?? 0,
    isLoading,
    isValidating,
    isSubmitting,
    error: error?.message || null,
    submitError,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    refresh: mutate,
    clearError,
  };
}

export type { Alert, AlertsResponse, UseAlertsOptions };