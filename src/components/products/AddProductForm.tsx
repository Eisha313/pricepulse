'use client';

import { useState } from 'react';
import type { CreateProductInput } from '@/hooks/useProducts';

interface AddProductFormProps {
  onSubmit: (input: CreateProductInput) => Promise<void>;
  disabled?: boolean;
}

export function AddProductForm({ onSubmit, disabled }: AddProductFormProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url || !name || !targetPrice) {
      setError('Please fill in all fields');
      return;
    }

    const parsedPrice = parseFloat(targetPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please enter a valid target price');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        url,
        name,
        targetPrice: parsedPrice,
      });
      
      // Reset form on success
      setUrl('');
      setName('');
      setTargetPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Track a New Product</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Product URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/product"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled || isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Product Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="iPhone 15 Pro"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled || isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-700 mb-1">
            Target Price ($)
          </label>
          <input
            id="targetPrice"
            type="number"
            step="0.01"
            min="0.01"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="999.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled || isSubmitting}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            We&apos;ll notify you when the price drops to or below this amount
          </p>
        </div>

        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Adding Product...' : 'Track Product'}
        </button>
      </div>
    </form>
  );
}
