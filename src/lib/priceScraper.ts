import { JSDOM } from 'jsdom';

interface ScrapedPrice {
  price: number;
  currency: string;
  title?: string;
  imageUrl?: string;
  available: boolean;
}

interface ScraperConfig {
  priceSelectors: string[];
  titleSelectors: string[];
  imageSelectors: string[];
  availabilitySelectors: string[];
}

const DEFAULT_CONFIG: ScraperConfig = {
  priceSelectors: [
    '[data-price]',
    '.price',
    '.product-price',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price .a-offscreen',
    '[itemprop="price"]',
    '.price-current',
    '.sale-price',
    '.current-price',
  ],
  titleSelectors: [
    'h1',
    '[data-product-title]',
    '.product-title',
    '#productTitle',
    '[itemprop="name"]',
  ],
  imageSelectors: [
    '[data-product-image]',
    '.product-image img',
    '#landingImage',
    '[itemprop="image"]',
    '.product-gallery img',
  ],
  availabilitySelectors: [
    '#availability',
    '.availability',
    '[data-availability]',
    '.stock-status',
  ],
};

const SITE_CONFIGS: Record<string, Partial<ScraperConfig>> = {
  'amazon.com': {
    priceSelectors: [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price-whole',
    ],
    titleSelectors: ['#productTitle'],
    imageSelectors: ['#landingImage', '#imgBlkFront'],
    availabilitySelectors: ['#availability span'],
  },
  'ebay.com': {
    priceSelectors: ['.x-price-primary span', '[itemprop="price"]'],
    titleSelectors: ['.x-item-title__mainTitle span', 'h1.it-ttl'],
  },
  'walmart.com': {
    priceSelectors: ['[data-testid="price-wrap"] span', '.price-characteristic'],
    titleSelectors: ['h1[itemprop="name"]'],
  },
  'target.com': {
    priceSelectors: ['[data-test="product-price"]', '.styles__CurrentPriceFontSize'],
    titleSelectors: ['[data-test="product-title"]', 'h1'],
  },
  'bestbuy.com': {
    priceSelectors: ['.priceView-customer-price span', '[data-testid="customer-price"]'],
    titleSelectors: ['.sku-title h1', '.heading-5'],
  },
};

function getConfigForUrl(url: string): ScraperConfig {
  const hostname = new URL(url).hostname.replace('www.', '');
  const siteConfig = SITE_CONFIGS[hostname] || {};
  
  return {
    priceSelectors: [...(siteConfig.priceSelectors || []), ...DEFAULT_CONFIG.priceSelectors],
    titleSelectors: [...(siteConfig.titleSelectors || []), ...DEFAULT_CONFIG.titleSelectors],
    imageSelectors: [...(siteConfig.imageSelectors || []), ...DEFAULT_CONFIG.imageSelectors],
    availabilitySelectors: [...(siteConfig.availabilitySelectors || []), ...DEFAULT_CONFIG.availabilitySelectors],
  };
}

function extractPrice(text: string): { price: number; currency: string } | null {
  if (!text) return null;
  
  // Clean the text
  const cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Match various price formats
  const pricePatterns = [
    /([\$\€\£\¥])\s*([\d,]+\.?\d*)/,  // $99.99, € 99,99
    /([\d,]+\.?\d*)\s*([\$\€\£\¥])/,  // 99.99$
    /([\d,]+\.?\d*)\s*(USD|EUR|GBP|JPY)/i,  // 99.99 USD
  ];
  
  for (const pattern of pricePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const currencySymbols: Record<string, string> = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
      };
      
      let priceStr: string;
      let currency: string;
      
      if (/[\$\€\£\¥]/.test(match[1])) {
        currency = currencySymbols[match[1]] || 'USD';
        priceStr = match[2];
      } else if (/[\$\€\£\¥]/.test(match[2])) {
        currency = currencySymbols[match[2]] || 'USD';
        priceStr = match[1];
      } else {
        priceStr = match[1];
        currency = match[2].toUpperCase();
      }
      
      // Handle European number format (1.234,56 vs 1,234.56)
      const hasEuropeanFormat = priceStr.includes(',') && priceStr.indexOf(',') > priceStr.indexOf('.');
      if (hasEuropeanFormat) {
        priceStr = priceStr.replace('.', '').replace(',', '.');
      } else {
        priceStr = priceStr.replace(',', '');
      }
      
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        return { price, currency };
      }
    }
  }
  
  return null;
}

function findElementBySelectors(document: Document, selectors: string[]): Element | null {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) return element;
    } catch {
      // Invalid selector, continue to next
    }
  }
  return null;
}

function checkAvailability(document: Document, selectors: string[]): boolean {
  const element = findElementBySelectors(document, selectors);
  if (!element) return true; // Assume available if no element found
  
  const text = element.textContent?.toLowerCase() || '';
  const unavailableKeywords = ['out of stock', 'unavailable', 'sold out', 'not available', 'currently unavailable'];
  
  return !unavailableKeywords.some(keyword => text.includes(keyword));
}

export async function scrapePrice(url: string): Promise<ScrapedPrice | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const config = getConfigForUrl(url);
    
    // Extract price
    let priceData: { price: number; currency: string } | null = null;
    
    for (const selector of config.priceSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.getAttribute('data-price') || element.textContent || '';
          priceData = extractPrice(text);
          if (priceData) break;
        }
        if (priceData) break;
      } catch {
        // Invalid selector, continue
      }
    }
    
    if (!priceData) {
      console.error(`Could not extract price from ${url}`);
      return null;
    }
    
    // Extract title
    const titleElement = findElementBySelectors(document, config.titleSelectors);
    const title = titleElement?.textContent?.trim();
    
    // Extract image
    const imageElement = findElementBySelectors(document, config.imageSelectors) as HTMLImageElement | null;
    const imageUrl = imageElement?.src || imageElement?.getAttribute('data-src') || undefined;
    
    // Check availability
    const available = checkAvailability(document, config.availabilitySelectors);
    
    return {
      price: priceData.price,
      currency: priceData.currency,
      title,
      imageUrl,
      available,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
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

export function getSupportedDomains(): string[] {
  return Object.keys(SITE_CONFIGS);
}