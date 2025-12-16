'use client';

import { useState } from 'react';
import { formatCurrency, calculatePriceChange, formatPriceChange } from '@/lib/priceUtils';
import { PriceHistoryChart } from '@/components/charts/PriceHistoryChart';
import { usePriceHistory } from '@/hooks/usePriceHistory';

interface Product {
  id: string;
  name: string;
  url: string;
  currentPrice: number;
  targetPrice: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductCardProps {
  product: Product;
  onDelete?: (id: string) => void;
  onEdit?: (product: Product) => void;
}

export function ProductCard({ product, onDelete, onEdit }: ProductCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { priceHistory, isLoading: historyLoading } = usePriceHistory(product.id, showChart);

  const priceChange = priceHistory && priceHistory.length >= 2
    ? calculatePriceChange(priceHistory[0].price, priceHistory[priceHistory.length - 1].price)
    : null;

  const isAtTargetPrice = product.targetPrice && product.currentPrice <= product.targetPrice;
  const percentToTarget = product.targetPrice
    ? ((product.currentPrice - product.targetPrice) / product.targetPrice * 100).toFixed(1)
    : null;

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    setIsDeleting(true);
    try {
      await onDelete(product.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${
      isAtTargetPrice ? 'ring-2 ring-green-500' : ''
    }`}>
      {/* Header with image */}
      <div className="relative h-48 bg-gray-100">
        {product.imageUrl && !imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-4"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Target price badge */}
        {isAtTargetPrice && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Target Reached!
          </div>
        )}

        {/* Price change indicator */}
        {priceChange !== null && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
            priceChange < 0 ? 'bg-green-100 text-green-800' : priceChange > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {formatPriceChange(priceChange)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1" title={product.name}>
            {product.name}
          </h3>
        </div>

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {getDomain(product.url)}
        </a>

        {/* Price info */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(product.currentPrice)}
            </p>
            {product.targetPrice && (
              <p className="text-sm text-gray-500">
                Target: {formatCurrency(product.targetPrice)}
                {percentToTarget && Number(percentToTarget) > 0 && (
                  <span className="ml-1 text-orange-600">({percentToTarget}% away)</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Chart toggle */}
        <button
          onClick={() => setShowChart(!showChart)}
          className="w-full text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2 py-2 border-t border-gray-100"
        >
          <svg className={`w-4 h-4 transition-transform ${showChart ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showChart ? 'Hide' : 'Show'} Price History
        </button>

        {/* Price history chart */}
        {showChart && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {historyLoading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : priceHistory && priceHistory.length > 1 ? (
              <PriceHistoryChart data={priceHistory} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Not enough data to show price history yet
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
