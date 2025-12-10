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

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 15000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * attempt;
        if (attempt < retries) {
          await delay(waitTime);
          continue;
        }
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < retries) {
        await delay(RETRY_DELAY * attempt);
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        lastError = new Error('Request timeout');
      }

      if (attempt < retries) {
        await delay(RETRY_DELAY * attempt);
        continue;
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

function parsePrice(priceString: string): { price: number; currency: string } | null {
  if (!priceString || typeof priceString !== 'string') {
    return null;
  }

  // Clean the string
  const cleaned = priceString.trim().replace(/\s+/g, ' ');

  // Currency patterns
  const currencyMap: Record<string, string> = {
    '$': 'USD',
    '£': 'GBP',
    '€': 'EUR',
    '¥': 'JPY',
    '₹': 'INR',
    'USD': 'USD',
    'GBP': 'GBP',
    'EUR': 'EUR',
  };

  let currency = 'USD';
  let priceValue = cleaned;

  // Extract currency
  for (const [symbol, code] of Object.entries(currencyMap)) {
    if (cleaned.includes(symbol)) {
      currency = code;
      priceValue = cleaned.replace(symbol, '');
      break;
    }
  }

  // Handle different number formats (1,234.56 vs 1.234,56)
  priceValue = priceValue.replace(/[^\d.,]/g, '');

  // Detect format and normalize
  const hasCommaDecimal = /,\d{2}$/.test(priceValue);
  const hasDotDecimal = /\.\d{2}$/.test(priceValue);

  if (hasCommaDecimal && !hasDotDecimal) {
    // European format: 1.234,56 -> 1234.56
    priceValue = priceValue.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56 -> 1234.56
    priceValue = priceValue.replace(/,/g, '');
  }

  const price = parseFloat(priceValue);

  if (isNaN(price) || price <= 0 || price > 1000000) {
    return null;
  }

  return { price, currency };
}

function extractAmazonProduct($: cheerio.CheerioAPI): ScrapedProduct | null {
  const title = $('#productTitle').text().trim() ||
                $('#title').text().trim() ||
                $('h1.product-title-word-break').text().trim();

  // Multiple price selectors for different Amazon layouts
  const priceSelectors = [
    '.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '#priceblock_saleprice',
    '.a-price-whole',
    '#corePrice_feature_div .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-offscreen',
    '.apexPriceToPay .a-offscreen',
  ];

  let priceText = '';
  for (const selector of priceSelectors) {
    const element = $(selector).first();
    if (element.length) {
      priceText = element.text().trim();
      if (priceText) break;
    }
  }

  const priceData = parsePrice(priceText);
  if (!title || !priceData) {
    return null;
  }

  const imageUrl = $('#landingImage').attr('src') ||
                   $('#imgBlkFront').attr('src') ||
                   $('.a-dynamic-image').first().attr('src');

  const availability = $('#availability span').first().text().trim() ||
                       $('#outOfStock span').first().text().trim() ||
                       'Unknown';

  return {
    title,
    price: priceData.price,
    currency: priceData.currency,
    imageUrl: imageUrl || undefined,
    availability,
  };
}

function extractGenericProduct($: cheerio.CheerioAPI): ScrapedProduct | null {
  // Try JSON-LD structured data first
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const jsonText = $(jsonLdScripts[i]).html();
      if (!jsonText) continue;

      const data = JSON.parse(jsonText);
      const product = Array.isArray(data) ? data.find(d => d['@type'] === 'Product') : (data['@type'] === 'Product' ? data : null);

      if (product?.name && product?.offers) {
        const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        const price = parseFloat(offers?.price || offers?.lowPrice || '0');

        if (price > 0) {
          return {
            title: product.name,
            price,
            currency: offers?.priceCurrency || 'USD',
            imageUrl: Array.isArray(product.image) ? product.image[0] : product.image,
            availability: offers?.availability?.includes('InStock') ? 'In Stock' : 'Unknown',
          };
        }
      }
    } catch {
      // Continue to next script
    }
  }

  // Fallback to meta tags
  const title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('h1').first().text().trim() ||
                $('title').text().trim();

  const priceSelectors = [
    '[itemprop="price"]',
    '.price',
    '.product-price',
    '.current-price',
    '.sale-price',
    '[data-price]',
    '.price-current',
    '.product__price',
  ];

  let priceText = '';
  for (const selector of priceSelectors) {
    const element = $(selector).first();
    if (element.length) {
      priceText = element.attr('content') || element.text().trim();
      if (priceText) break;
    }
  }

  const priceData = parsePrice(priceText);
  if (!title || !priceData) {
    return null;
  }

  const imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content');

  return {
    title: title.substring(0, 500),
    price: priceData.price,
    currency: priceData.currency,
    imageUrl: imageUrl || undefined,
  };
}

export async function scrapeProduct(url: string): Promise<ScrapeResult> {
  try {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { success: false, error: 'Invalid URL format' };
    }

    // Check for supported protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { success: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }

    const response = await fetchWithRetry(url);
    const html = await response.text();

    if (!html || html.length < 100) {
      return { success: false, error: 'Empty or invalid response from URL' };
    }

    const $ = cheerio.load(html);
    const hostname = parsedUrl.hostname.toLowerCase();

    let product: ScrapedProduct | null = null;

    // Route to appropriate extractor
    if (hostname.includes('amazon.')) {
      product = extractAmazonProduct($);
    } else {
      product = extractGenericProduct($);
    }

    if (product) {
      return { success: true, data: product };
    }

    return {
      success: false,
      error: 'Could not extract product information. The page structure may not be supported.',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: `Scraping failed: ${errorMessage}` };
  }
}

export async function scrapePrice(url: string): Promise<number | null> {
  const result = await scrapeProduct(url);
  return result.success && result.data ? result.data.price : null;
}