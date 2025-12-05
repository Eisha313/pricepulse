import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  availability?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedProduct;
  error?: string;
}

const SUPPORTED_DOMAINS = [
  'amazon.com',
  'amazon.co.uk',
  'ebay.com',
  'walmart.com',
  'target.com',
  'bestbuy.com',
];

export function isSupportedUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return SUPPORTED_DOMAINS.some(domain => 
      parsedUrl.hostname.includes(domain)
    );
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch {
    return null;
  }
}

function cleanPrice(priceString: string | null | undefined): number | null {
  if (!priceString || typeof priceString !== 'string') {
    return null;
  }
  
  // Remove all non-numeric characters except decimal point
  const cleaned = priceString.replace(/[^0-9.]/g, '');
  
  if (!cleaned || cleaned === '') {
    return null;
  }
  
  const price = parseFloat(cleaned);
  
  // Validate the price is a reasonable number
  if (isNaN(price) || !isFinite(price) || price < 0 || price > 1000000) {
    return null;
  }
  
  return price;
}

function extractCurrency(priceString: string | null | undefined): string {
  if (!priceString || typeof priceString !== 'string') {
    return 'USD';
  }
  
  if (priceString.includes('£')) return 'GBP';
  if (priceString.includes('€')) return 'EUR';
  if (priceString.includes('¥')) return 'JPY';
  if (priceString.includes('$')) return 'USD';
  
  return 'USD';
}

function cleanText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.trim().replace(/\s+/g, ' ');
}

function extractImageUrl(imgSrc: string | null | undefined, baseUrl: string): string | undefined {
  if (!imgSrc || typeof imgSrc !== 'string') {
    return undefined;
  }
  
  try {
    // Handle relative URLs
    if (imgSrc.startsWith('//')) {
      return `https:${imgSrc}`;
    }
    if (imgSrc.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.origin}${imgSrc}`;
    }
    // Validate it's a proper URL
    new URL(imgSrc);
    return imgSrc;
  } catch {
    return undefined;
  }
}

async function scrapeAmazon(html: string, url: string): Promise<ScrapedProduct | null> {
  const $ = cheerio.load(html);
  
  const title = cleanText($('#productTitle').text()) || 
                cleanText($('#title').text()) ||
                cleanText($('h1.product-title-word-break').text());
  
  if (!title) {
    return null;
  }
  
  const priceSelectors = [
    '.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price-whole',
    '#corePrice_feature_div .a-offscreen',
  ];
  
  let priceText: string | null = null;
  for (const selector of priceSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      priceText = element.text();
      if (priceText && cleanPrice(priceText) !== null) {
        break;
      }
    }
  }
  
  const price = cleanPrice(priceText);
  if (price === null) {
    return null;
  }
  
  const imageUrl = extractImageUrl(
    $('#landingImage').attr('src') || $('#imgBlkFront').attr('src'),
    url
  );
  
  const availability = cleanText($('#availability span').text()) || undefined;
  
  return {
    title,
    price,
    currency: extractCurrency(priceText),
    imageUrl,
    availability,
  };
}

async function scrapeGeneric(html: string, url: string): Promise<ScrapedProduct | null> {
  const $ = cheerio.load(html);
  
  // Try common title selectors
  const titleSelectors = [
    'h1.product-title',
    'h1.product-name',
    '[data-testid="product-title"]',
    '.product-title h1',
    'h1',
  ];
  
  let title = '';
  for (const selector of titleSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      title = cleanText(element.text());
      if (title && title.length > 0 && title.length < 500) {
        break;
      }
    }
  }
  
  if (!title) {
    return null;
  }
  
  // Try common price selectors
  const priceSelectors = [
    '[data-testid="product-price"]',
    '.product-price',
    '.price-current',
    '.price',
    '[itemprop="price"]',
    '.sale-price',
    '.current-price',
  ];
  
  let priceText: string | null = null;
  for (const selector of priceSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      priceText = element.attr('content') || element.text();
      if (priceText && cleanPrice(priceText) !== null) {
        break;
      }
    }
  }
  
  const price = cleanPrice(priceText);
  if (price === null) {
    return null;
  }
  
  // Try to find product image
  const imageSelectors = [
    '.product-image img',
    '[data-testid="product-image"]',
    '.gallery-image img',
    '.product-gallery img',
  ];
  
  let imageUrl: string | undefined;
  for (const selector of imageSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      imageUrl = extractImageUrl(element.attr('src'), url);
      if (imageUrl) {
        break;
      }
    }
  }
  
  return {
    title,
    price,
    currency: extractCurrency(priceText),
    imageUrl,
  };
}

export async function scrapeProduct(url: string): Promise<ScrapeResult> {
  try {
    if (!url || typeof url !== 'string') {
      return {
        success: false,
        error: 'Invalid URL provided',
      };
    }
    
    const domain = extractDomain(url);
    if (!domain) {
      return {
        success: false,
        error: 'Could not parse URL',
      };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch page: HTTP ${response.status}`,
      };
    }
    
    const html = await response.text();
    
    if (!html || html.length < 100) {
      return {
        success: false,
        error: 'Received empty or invalid response from page',
      };
    }
    
    let product: ScrapedProduct | null = null;
    
    if (domain.includes('amazon')) {
      product = await scrapeAmazon(html, url);
    } else {
      product = await scrapeGeneric(html, url);
    }
    
    if (!product) {
      return {
        success: false,
        error: 'Could not extract product information from page',
      };
    }
    
    // Final validation
    if (!product.title || product.title.length === 0) {
      return {
        success: false,
        error: 'Could not extract product title',
      };
    }
    
    if (typeof product.price !== 'number' || product.price <= 0) {
      return {
        success: false,
        error: 'Could not extract valid product price',
      };
    }
    
    return {
      success: true,
      data: product,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out while fetching product page',
        };
      }
      return {
        success: false,
        error: `Scraping failed: ${error.message}`,
      };
    }
    return {
      success: false,
      error: 'An unexpected error occurred while scraping',
    };
  }
}
