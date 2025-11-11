'use client';

import { useState } from 'react';

interface AlertWithProduct {
  id: string;
  targetPrice: number;
  isActive: boolean;
  triggered: boolean;
  createdAt: string;
  product: {
    id: string;
    name: string;
    url: string;
    currentPrice: number;
    imageUrl?: string;
  };
}

interface AlertCardProps {
  alert: AlertWithProduct;
  onUpdate: (id: string, data: { targetPrice?: number; isActive?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function AlertCard({ alert, onUpdate, onDelete }: AlertCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetPrice, setTargetPrice] = useState(alert.targetPrice.toString());
  const [isLoading, setIsLoading] = useState(false);

  const priceDiff = alert.product.currentPrice - alert.targetPrice;
  const percentDiff = ((priceDiff / alert.product.currentPrice) * 100).toFixed(1);
  const isNearTarget = priceDiff <= alert.targetPrice * 0.1;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdate(alert.id, { targetPrice: parseFloat(targetPrice) });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update alert:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setIsLoading(true);
    try {
      await onUpdate(alert.id, { isActive: !alert.isActive });
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    
    setIsLoading(true);
    try {
      await onDelete(alert.id);
    } catch (error) {
      console.error('Failed to delete alert:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
      alert.triggered 
        ? 'border-green-500' 
        : isNearTarget 
          ? 'border-yellow-500' 
          : 'border-blue-500'
    } ${!alert.isActive ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-800 truncate">
            {alert.product.name}
          </h3>
          <a 
            href={alert.product.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View Product
          </a>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            disabled={isLoading}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              alert.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {alert.isActive ? 'Active' : 'Paused'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Current Price</p>
          <p className="text-xl font-bold text-gray-800">
            ${alert.product.currentPrice.toFixed(2)}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Target Price</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-24 px-2 py-1 border rounded text-lg"
              />
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="text-green-600 hover:text-green-800"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setTargetPrice(alert.targetPrice.toString());
                  setIsEditing(false);
                }}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          ) : (
            <p 
              className="text-xl font-bold text-blue-600 cursor-pointer hover:text-blue-800"
              onClick={() => setIsEditing(true)}
            >
              ${alert.targetPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <div className="text-sm">
          {alert.triggered ? (
            <span className="text-green-600 font-medium">🎉 Price target reached!</span>
          ) : priceDiff > 0 ? (
            <span className="text-gray-600">
              ${priceDiff.toFixed(2)} ({percentDiff}%) above target
            </span>
          ) : (
            <span className="text-green-600">
              ${Math.abs(priceDiff).toFixed(2)} below target!
            </span>
          )}
        </div>
        
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}