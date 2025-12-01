import { z } from 'zod';

export const alertTypeSchema = z.enum(['PRICE_DROP', 'TARGET_PRICE', 'BACK_IN_STOCK']);

export const createAlertSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  type: alertTypeSchema,
  targetPrice: z
    .number()
    .positive('Target price must be positive')
    .max(1000000, 'Target price is too high')
    .optional(),
  percentageDrop: z
    .number()
    .min(1, 'Percentage must be at least 1%')
    .max(99, 'Percentage must be less than 100%')
    .optional(),
});

export const updateAlertSchema = z.object({
  targetPrice: z.number().positive().max(1000000).optional(),
  percentageDrop: z.number().min(1).max(99).optional(),
  isActive: z.boolean().optional(),
});

export type AlertType = z.infer<typeof alertTypeSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
