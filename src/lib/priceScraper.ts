import { JSDOM } from 'jsdom';

export interface ScrapedPrice {
  price: number;
  currency: string;
  title?: string;
  imageUrl?: string;
  available: boolean;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedPrice;
  error?: string;
  retryable?: boolean;
}

const RETRY_DELAYS = [1000, 2000, 5000]; // milliseconds
const MAX_RETRIES = 3;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempt: number = 0): Promise<Response> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      },
    });

    if (response.status === 429 || response.status >= 500) {
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAYS[attempt] || 5000);
        return fetchWithRetry(url, attempt + 1);
      }
    }

    return response;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      await delay(RETRY_DELAYS[attempt] || 5000);
      return fetchWithRetry(url, attempt + 1);
    }
    throw error;
  }
}

function parsePrice(priceString: string): { price: number; currency: string } | null {
  if (!priceString || typeof priceString !== 'string') {
    return null;
  }

  // Clean the string
  const cleaned = priceString.trim();
  
  // Currency patterns
  const currencyPatterns: { pattern: RegExp; currency: string }[] = [
    { pattern: /\$([\d,]+\.?\d*)/, currency: 'USD' },
    { pattern: /€([\d,]+\.?\d*)/, currency: 'EUR' },
    { pattern: /£([\d,]+\.?\d*)/, currency: 'GBP' },
    { pattern: /([\d,]+\.?\d*)\s*USD/, currency: 'USD' },
    { pattern: /([\d,]+\.?\d*)\s*EUR/, currency: 'EUR' },
    { pattern: /([\d,]+\.?\d*)\s*GBP/, currency: 'GBP' },
  ];

  for (const { pattern, currency } of currencyPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 0 && price < 1000000) {
        return { price, currency };
      }
    }
  }

  // Fallback: try to extract any number
  const numberMatch = cleaned.match(/([\d,]+\.?\d*)/);
  if (numberMatch && numberMatch[1]) {
    const price = parseFloat(numberMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0 && price < 1000000) {
      return { price, currency: 'USD' };
    }
  }

  return null;
}

function extractFromSelectors(doc: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    try {
      const element = doc.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text) return text;
        
        // Check for value attribute (input elements)
        const value = element.getAttribute('value');
        if (value) return value;
        
        // Check for content attribute (meta elements)
        const content = element.getAttribute('content');
        if (content) return content;
      }
    } catch {
      // Invalid selector, skip
      continue;
    }
  }
  return null;
}

const PRICE_SELECTORS = [
  // Amazon
  '#priceblock_ourprice',
  '#priceblock_dealprice',
  '.a-price .a-offscreen',
  '#corePrice_feature_div .a-offscreen',
  'span[data-a-color="price"] .a-offscreen',
  // Generic e-commerce
  '[data-price]',
  '[itemprop="price"]',
  '.price',
  '.product-price',
  '.current-price',
  '.sale-price',
  '.final-price',
  '#product-price',
  '.price-current',
  '.now-price',
  // Meta tags
  'meta[property="product:price:amount"]',
  'meta[property="og:price:amount"]',
];

const TITLE_SELECTORS = [
  '#productTitle',
  'h1[itemprop="name"]',
  '[data-testid="product-title"]',
  '.product-title',
  '.product-name',
  'h1.title',
  'meta[property="og:title"]',
  'meta[name="title"]',
  'title',
];

const IMAGE_SELECTORS = [
  '#landingImage',
  '#imgBlkFront',
  '[data-testid="product-image"] img',
  '.product-image img',
  '[itemprop="image"]',
  'meta[property="og:image"]',
];

const AVAILABILITY_PATTERNS = [
  /in stock/i,
  /available/i,
  /add to cart/i,
  /buy now/i,
];

const OUT_OF_STOCK_PATTERNS = [
  /out of stock/i,
  /unavailable/i,
  /sold out/i,
  /currently unavailable/i,
];

export async function scrapePrice(url: string): Promise<ScrapeResult> {
  try {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        success: false,
        error: 'Invalid URL format',
        retryable: false,
      };
    }

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        success: false,
        error: 'Only HTTP and HTTPS URLs are supported',
        retryable: false,
      };
    }

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 429;
      return {
        success: false,
        error: `Failed to fetch page: HTTP ${response.status}`,
        retryable,
      };
    }

    const html = await response.text();
    
    if (!html || html.length < 100) {
      return {
        success: false,
        error: 'Empty or invalid page content',
        retryable: true,
      };
    }

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extract price
    const priceText = extractFromSelectors(doc, PRICE_SELECTORS);
    if (!priceText) {
      return {
        success: false,
        error: 'Could not find price on page',
        retryable: true,
      };
    }

    const parsedPrice = parsePrice(priceText);
    if (!parsedPrice) {
      return {
        success: false,
        error: `Could not parse price from: ${priceText.substring(0, 50)}`,
        retryable: false,
      };
    }

    // Extract title
    let title = extractFromSelectors(doc, TITLE_SELECTORS);
    if (title && title.length > 200) {
      title = title.substring(0, 200) + '...';
    }

    // Extract image
    let imageUrl: string | undefined;
    for (const selector of IMAGE_SELECTORS) {
      try {
        const element = doc.querySelector(selector);
        if (element) {
          imageUrl = element.getAttribute('src') || 
                     element.getAttribute('content') || 
                     element.getAttribute('href') ||
                     undefined;
          if (imageUrl) break;
        }
      } catch {
        continue;
      }
    }

    // Make image URL absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, url).href;
      } catch {
        imageUrl = undefined;
      }
    }

    // Check availability
    const bodyText = doc.body?.textContent || '';
    let available = true;
    
    for (const pattern of OUT_OF_STOCK_PATTERNS) {
      if (pattern.test(bodyText)) {
        available = false;
        break;
      }
    }

    return {
      success: true,
      data: {
        price: parsedPrice.price,
        currency: parsedPrice.currency,
        title: title || undefined,
        imageUrl,
        available,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const retryable = errorMessage.includes('ECONNREFUSED') || 
                      errorMessage.includes('ETIMEDOUT') ||
                      errorMessage.includes('fetch failed');
    
    return {
      success: false,
      error: `Scraping failed: ${errorMessage}`,
      retryable,
    };
  }
}

export function isValidProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
