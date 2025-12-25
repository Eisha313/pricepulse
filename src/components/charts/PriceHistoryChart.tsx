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
import { PriceHistoryEntry } from '@/types';
import {
  transformPriceHistory,
  formatCurrency,
  getChartDomain,
  ChartDataPoint,
} from '@/lib/chartUtils';

interface PriceHistoryChartProps {
  data: PriceHistoryEntry[];
  targetPrice?: number | null;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm text-gray-500">{data.formattedDate}</p>
      <p className="text-lg font-semibold text-gray-900">{data.formattedPrice}</p>
    </div>
  );
}

export function PriceHistoryChart({
  data,
  targetPrice,
  height = 300,
}: PriceHistoryChartProps) {
  const chartData = useMemo(() => transformPriceHistory(data), [data]);
  
  const domain = useMemo(() => {
    const baseDomain = getChartDomain(chartData);
    
    // Include target price in domain if it exists and is valid
    if (targetPrice !== null && targetPrice !== undefined && !isNaN(targetPrice) && targetPrice > 0) {
      return [
        Math.min(baseDomain[0], targetPrice * 0.9),
        Math.max(baseDomain[1], targetPrice * 1.1),
      ] as [number, number];
    }
    
    return baseDomain;
  }, [chartData, targetPrice]);

  if (chartData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
        style={{ height }}
      >
        <p className="text-gray-500">No price history available</p>
      </div>
    );
  }

  const validTargetPrice = targetPrice !== null && 
    targetPrice !== undefined && 
    !isNaN(targetPrice) && 
    targetPrice > 0;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => {
              if (value === null || value === undefined || isNaN(value)) {
                return '$0';
              }
              return formatCurrency(value);
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {validTargetPrice && (
            <ReferenceLine
              y={targetPrice}
              stroke="#10b981"
              strokeDasharray="5 5"
              label={{
                value: `Target: ${formatCurrency(targetPrice)}`,
                position: 'right',
                fill: '#10b981',
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
            activeDot={{ fill: '#1d4ed8', strokeWidth: 2, r: 6 }}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PriceHistoryChart;
