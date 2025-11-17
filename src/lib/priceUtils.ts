export function parsePrice(priceString: string): number | null {
  if (!priceString || typeof priceString !== 'string') {
    return null;
  }

  // Remove currency symbols and whitespace
  const cleaned = priceString
    .replace(/[^\d.,]/g, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  // Handle different decimal separators (e.g., 1,234.56 or 1.234,56)
  let normalized = cleaned;
  
  // If there's both comma and dot, determine which is decimal separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // European format: 1.234,56
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Could be either 1,234 (thousands) or 1,23 (decimal)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal separator
      normalized = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator
      normalized = cleaned.replace(/,/g, '');
    }
  }

  const price = parseFloat(normalized);
  
  if (isNaN(price) || price < 0) {
    return null;
  }

  // Round to 2 decimal places
  return Math.round(price * 100) / 100;
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}

export function calculatePriceChange(
  currentPrice: number,
  previousPrice: number
): { change: number; percentage: number; direction: 'up' | 'down' | 'same' } {
  const change = currentPrice - previousPrice;
  const percentage = previousPrice > 0 
    ? Math.round((change / previousPrice) * 10000) / 100 
    : 0;

  let direction: 'up' | 'down' | 'same' = 'same';
  if (change > 0.01) direction = 'up';
  else if (change < -0.01) direction = 'down';

  return { change, percentage, direction };
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}
