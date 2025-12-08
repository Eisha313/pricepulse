'use client';

import { useState } from 'react';
import { formatPrice, isPriceAtOrBelowTarget } from '@/lib/priceUtils';

interface Alert {
  id: string;
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
  product: {
    id: string;
    name: string;
    url: string;
    currentPrice: number | null;
    imageUrl: string | null;
  };
}

interface AlertCardProps {
  alert: Alert;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
}

export function AlertCard({ alert, onDelete, onToggle }: AlertCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { product, targetPrice, isActive } = alert;
  const currentPrice = product.currentPrice;
  
  // Use safe price comparison
  const isTargetReached = isPriceAtOrBelowTarget(currentPrice, targetPrice);
  
  // Calculate price difference safely
  const priceDifference = currentPrice !== null 
    ? currentPrice - targetPrice 
    : null;

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle(alert.id, !isActive);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onDelete(alert.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
      isTargetReached 
        ? 'border-green-500' 
        : isActive 
          ? 'border-blue-500' 
          : 'border-gray-300'
    }`}>
      <div className="flex items-start gap-4">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-16 h-16 object-cover rounded"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {product.name}
          </h3>
          
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600">
              Current Price:{' '}
              <span className={`font-medium ${
                isTargetReached ? 'text-green-600' : 'text-gray-900'
              }`}>
                {formatPrice(currentPrice)}
              </span>
            </p>
            
            <p className="text-sm text-gray-600">
              Target Price:{' '}
              <span className="font-medium text-gray-900">
                {formatPrice(targetPrice)}
              </span>
            </p>
            
            {priceDifference !== null && (
              <p className={`text-sm font-medium ${
                priceDifference <= 0 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {priceDifference <= 0 
                  ? `🎉 ${formatPrice(Math.abs(priceDifference))} below target!`
                  : `${formatPrice(priceDifference)} above target`
                }
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            
            {isTargetReached && isActive && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Target Reached!
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              isActive
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {isLoading ? '...' : isActive ? 'Pause' : 'Resume'}
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Delete'}
          </button>
          
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-center"
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
}