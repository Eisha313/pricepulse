'use client';

import { useState } from 'react';
import type { Product } from '@/hooks/useProducts';

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; targetPrice?: number }) => Promise<void>;
}

export function ProductCard({ product, onDelete, onUpdate }: ProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(product.name);
  const [editTargetPrice, setEditTargetPrice] = useState(product.targetPrice.toString());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const priceDropped = product.currentPrice <= product.targetPrice;
  const priceDifference = product.currentPrice - product.targetPrice;
  const percentageToTarget = ((priceDifference / product.targetPrice) * 100).toFixed(1);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(product.id, {
        name: editName,
        targetPrice: parseFloat(editTargetPrice),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    setIsDeleting(true);
    try {
      await onDelete(product.id);
    } catch (error) {
      console.error('Failed to delete product:', error);
      setIsDeleting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
      priceDropped ? 'border-green-500' : 'border-blue-500'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {product.name}
            </h3>
          )}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline truncate block"
          >
            View product →
          </a>
        </div>
        
        {priceDropped && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Price dropped!
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Current Price</p>
          <p className={`text-xl font-bold ${
            priceDropped ? 'text-green-600' : 'text-gray-900'
          }`}>
            {formatPrice(product.currentPrice)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Target Price</p>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={editTargetPrice}
              onChange={(e) => setEditTargetPrice(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(product.targetPrice)}
            </p>
          )}
        </div>
      </div>

      {!priceDropped && (
        <p className="text-sm text-gray-600 mb-4">
          {percentageToTarget}% above target price
        </p>
      )}

      <div className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
