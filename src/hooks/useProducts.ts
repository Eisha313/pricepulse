import useSWR from 'swr';
import { useState, useCallback } from 'react';

interface Product {
  id: string;
  url: string;
  name: string;
  currentPrice: number;
  targetPrice: number | null;
  imageUrl: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductsResponse {
  products: Product[];
  total: number;
}

interface UseProductsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'currentPrice' | 'name';
  sortOrder?: 'asc' | 'desc';
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('Failed to fetch products');
    const data = await res.json().catch(() => ({}));
    (error as any).info = data;
    (error as any).status = res.status;
    throw error;
  }
  
  return res.json();
};

export function useProducts(options: UseProductsOptions = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
  });

  const { data, error, isLoading, isValidating, mutate } = useSWR<ProductsResponse>(
    `/api/products?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  const addProduct = useCallback(async (productData: { url: string; targetPrice?: number }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to add product');
      }

      await mutate();
      return responseData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add product';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to update product');
      }

      await mutate();
      return responseData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update product';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const deleteProduct = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const responseData = await res.json().catch(() => ({}));
        throw new Error(responseData.error || 'Failed to delete product');
      }

      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete product';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  const clearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  return {
    products: data?.products ?? [],
    total: data?.total ?? 0,
    isLoading,
    isValidating,
    isSubmitting,
    error: error?.message || null,
    submitError,
    addProduct,
    updateProduct,
    deleteProduct,
    refresh: mutate,
    clearError,
  };
}

export type { Product, ProductsResponse, UseProductsOptions };