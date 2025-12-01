import { z } from 'zod';

export const productUrlSchema = z
  .string()
  .url('Please enter a valid URL')
  .refine(
    (url) => {
      const supportedDomains = [
        'amazon.com',
        'amazon.co.uk',
        'ebay.com',
        'walmart.com',
        'target.com',
        'bestbuy.com',
      ];
      try {
        const urlObj = new URL(url);
        return supportedDomains.some((domain) =>
          urlObj.hostname.includes(domain)
        );
      } catch {
        return false;
      }
    },
    {
      message:
        'URL must be from a supported retailer (Amazon, eBay, Walmart, Target, Best Buy)',
    }
  );

export const targetPriceSchema = z
  .number()
  .positive('Target price must be positive')
  .max(1000000, 'Target price is too high');

export const createProductSchema = z.object({
  url: productUrlSchema,
  targetPrice: targetPriceSchema.optional(),
  name: z.string().min(1, 'Product name is required').max(200).optional(),
});

export const updateProductSchema = z.object({
  targetPrice: targetPriceSchema.optional(),
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
