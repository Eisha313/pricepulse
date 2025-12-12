export { productRepository } from './productRepository';
export type {
  ProductWithPriceHistory,
  CreateProductInput,
  UpdateProductInput,
} from './productRepository';

export { alertRepository } from './alertRepository';
export type {
  AlertWithProduct,
  CreateAlertInput,
  UpdateAlertInput,
} from './alertRepository';

// Re-export db for direct access when needed
export { db } from '@/lib/db';
