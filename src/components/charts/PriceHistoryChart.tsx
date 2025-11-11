'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PriceDataPoint {
  id: string;
  price: number;
  checkedAt: string;
}

interface PriceHistoryChartProps {
  data: PriceDataPoint[];
  targetPrice?: number;
  currency?: string;
}

export function PriceHistoryChart({
  data,
  targetPrice,
  currency = 'USD',
}: PriceHistoryChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      date: new Date(point.checkedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      timestamp: new Date(point.checkedAt).getTime(),
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const minPrice = Math.min(...chartData.map((d) => d.price));
  const maxPrice = Math.max(...chartData.map((d) => d.price));
  const yDomain = [
    Math.floor(minPrice * 0.95),
    Math.ceil(maxPrice * 1.05),
  ];

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No price history available yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={formatPrice}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            width={80}
          />
          <Tooltip
            formatter={(value: number) => [formatPrice(value), 'Price']}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
          {targetPrice && (
            <ReferenceLine
              y={targetPrice}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{
                value: `Target: ${formatPrice(targetPrice)}`,
                position: 'right',
                fill: '#22c55e',
                fontSize: 12,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceHistoryChartSkeleton() {
  return (
    <div className="w-full h-64 bg-gray-100 animate-pulse rounded-lg" />
  );
}