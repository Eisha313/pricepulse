import { useState, useEffect, useCallback } from 'react';

export interface Product {
  id: string;
  url: string;
  name: string;
  currentPrice: number;
  targetPrice: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  url: string;
  name: string;
  targetPrice: number;
}

export interface UpdateProductInput {
  name?: string;
  targetPrice?: number;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const addProduct = useCallback(async (input: CreateProductInput) => {
    try {
      setError(null);
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }

      const newProduct = await response.json();
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, []);

  const updateProduct = useCallback(async (id: string, input: UpdateProductInput) => {
    try {
      setError(null);
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      const updatedProduct = await response.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updatedProduct : p))
      );
      return updatedProduct;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
}
