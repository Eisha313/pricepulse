/**
 * Utility functions for price handling and formatting
 */

/**
 * Safely parse a price value to a number
 */
export function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  if (typeof value === 'string') {
    // Remove currency symbols and whitespace
    const cleaned = value.replace(/[^0-9.,-]/g, '').trim();
    
    // Handle different decimal separators
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);
    
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Format a price for display
 */
export function formatPrice(price: number | null | undefined, currency = 'USD'): string {
  if (price === null || price === undefined || isNaN(price)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Calculate percentage change between two prices
 */
export function calculatePriceChange(
  originalPrice: number | null,
  currentPrice: number | null
): { amount: number; percentage: number } | null {
  if (originalPrice === null || currentPrice === null) {
    return null;
  }

  if (originalPrice === 0) {
    return null;
  }

  const amount = currentPrice - originalPrice;
  const percentage = ((currentPrice - originalPrice) / originalPrice) * 100;

  return {
    amount: Math.round(amount * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Compare two prices safely
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b, null if comparison not possible
 */
export function comparePrices(
  a: number | null | undefined,
  b: number | null | undefined
): -1 | 0 | 1 | null {
  const priceA = parsePrice(a);
  const priceB = parsePrice(b);

  if (priceA === null || priceB === null) {
    return null;
  }

  // Use a small epsilon for floating point comparison
  const epsilon = 0.001;
  
  if (Math.abs(priceA - priceB) < epsilon) {
    return 0;
  }

  return priceA < priceB ? -1 : 1;
}

/**
 * Check if a price has dropped to or below a target
 */
export function isPriceAtOrBelowTarget(
  currentPrice: number | null | undefined,
  targetPrice: number | null | undefined
): boolean {
  const comparison = comparePrices(currentPrice, targetPrice);
  return comparison !== null && comparison <= 0;
}

/**
 * Get the lowest price from an array of price history entries
 */
export function getLowestPrice(
  priceHistory: Array<{ price: number | null }>
): number | null {
  const validPrices = priceHistory
    .map((entry) => parsePrice(entry.price))
    .filter((price): price is number => price !== null);

  if (validPrices.length === 0) {
    return null;
  }

  return Math.min(...validPrices);
}

/**
 * Get the highest price from an array of price history entries
 */
export function getHighestPrice(
  priceHistory: Array<{ price: number | null }>
): number | null {
  const validPrices = priceHistory
    .map((entry) => parsePrice(entry.price))
    .filter((price): price is number => price !== null);

  if (validPrices.length === 0) {
    return null;
  }

  return Math.max(...validPrices);
}

/**
 * Calculate average price from price history
 */
export function getAveragePrice(
  priceHistory: Array<{ price: number | null }>
): number | null {
  const validPrices = priceHistory
    .map((entry) => parsePrice(entry.price))
    .filter((price): price is number => price !== null);

  if (validPrices.length === 0) {
    return null;
  }

  const sum = validPrices.reduce((acc, price) => acc + price, 0);
  return Math.round((sum / validPrices.length) * 100) / 100;
}