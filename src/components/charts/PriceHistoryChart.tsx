'use client';

import { useMemo, useState } from 'react';
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
import {
  filterByTimeRange,
  formatChartData,
  aggregateDailyPrices,
  calculatePriceStats,
  getChartColors,
  TIME_RANGE_OPTIONS,
  TimeRange,
  PriceHistoryEntry,
} from '@/lib/chartUtils';

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryEntry[];
  targetPrice?: number;
  currency?: string;
  showStats?: boolean;
  height?: number;
}

export function PriceHistoryChart({
  priceHistory,
  targetPrice,
  currency = 'USD',
  showStats = true,
  height = 300,
}: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const colors = getChartColors('light');

  const { chartData, stats } = useMemo(() => {
    const filtered = filterByTimeRange(priceHistory, timeRange);
    const aggregated = aggregateDailyPrices(filtered);
    const data = formatChartData(aggregated, currency);
    const statistics = calculatePriceStats(aggregated);

    return { chartData: data, stats: statistics };
  }, [priceHistory, timeRange, currency]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.formattedDate}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.formattedPrice}
          </p>
        </div>
      );
    }
    return null;
  };

  if (priceHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          No price history available yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Price History
        </h3>
        <div className="flex gap-2">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Current"
            value={`$${stats.currentPrice.toFixed(2)}`}
          />
          <StatCard
            label="Lowest"
            value={`$${stats.lowestPrice.toFixed(2)}`}
            highlight="green"
          />
          <StatCard
            label="Highest"
            value={`$${stats.highestPrice.toFixed(2)}`}
            highlight="red"
          />
          <StatCard
            label="Change"
            value={`${stats.priceChange >= 0 ? '+' : ''}$${stats.priceChange.toFixed(2)}`}
            subValue={`${stats.priceChangePercent >= 0 ? '+' : ''}${stats.priceChangePercent.toFixed(1)}%`}
            highlight={stats.priceChange <= 0 ? 'green' : 'red'}
          />
        </div>
      )}

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fill: colors.text, fontSize: 12 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: colors.text, fontSize: 12 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={(value) => `$${value}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {targetPrice && (
              <ReferenceLine
                y={targetPrice}
                stroke={colors.secondary}
                strokeDasharray="5 5"
                label={{
                  value: `Target: $${targetPrice}`,
                  fill: colors.secondary,
                  fontSize: 12,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="price"
              stroke={colors.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: colors.primary }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  highlight?: 'green' | 'red';
}

function StatCard({ label, value, subValue, highlight }: StatCardProps) {
  const highlightClasses = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-lg font-semibold ${
          highlight
            ? highlightClasses[highlight]
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>
      {subValue && (
        <p
          className={`text-sm ${
            highlight
              ? highlightClasses[highlight]
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {subValue}
        </p>
      )}
    </div>
  );
}

export default PriceHistoryChart;
