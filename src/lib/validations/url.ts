import { z } from 'zod';

// List of blocked domains for security
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
];

// List of supported e-commerce domains (optional - for premium feature)
const SUPPORTED_DOMAINS = [
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.es',
  'amazon.it',
  'amazon.ca',
  'amazon.com.au',
  'ebay.com',
  'ebay.co.uk',
  'walmart.com',
  'target.com',
  'bestbuy.com',
  'newegg.com',
  'bhphotovideo.com',
  'adorama.com',
];

export function isPrivateIP(hostname: string): boolean {
  // Check for private IP ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^127\./,
    /^0\./,
  ];

  return privateRanges.some(range => range.test(hostname));
}

export function isBlockedDomain(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  return BLOCKED_DOMAINS.some(blocked => 
    lowerHostname === blocked || lowerHostname.endsWith(`.${blocked}`)
  );
}

export function isSupportedDomain(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  return SUPPORTED_DOMAINS.some(supported => 
    lowerHostname === supported || lowerHostname.endsWith(`.${supported}`)
  );
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

export const productUrlSchema = z
  .string()
  .url('Please enter a valid URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTP or HTTPS protocol' }
  )
  .refine(
    (url) => {
      const domain = extractDomain(url);
      if (!domain) return false;
      return !isBlockedDomain(domain) && !isPrivateIP(domain);
    },
    { message: 'This URL is not allowed' }
  );

export const strictProductUrlSchema = productUrlSchema.refine(
  (url) => {
    const domain = extractDomain(url);
    if (!domain) return false;
    return isSupportedDomain(domain);
  },
  { message: 'This website is not currently supported. Contact support for help.' }
);

export type ProductUrl = z.infer<typeof productUrlSchema>;
