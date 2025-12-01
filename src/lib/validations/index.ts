import { z, ZodError, ZodSchema } from 'zod';

export * from './product';
export * from './alert';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export function validateInput<T>(
  schema: ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return {
      success: false,
      errors: { _form: 'Validation failed' },
    };
  }
}

export async function validateAsync<T>(
  schema: ZodSchema<T>,
  input: unknown
): Promise<ValidationResult<T>> {
  try {
    const data = await schema.parseAsync(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return {
      success: false,
      errors: { _form: 'Validation failed' },
    };
  }
}

// Email validation schema
export const emailSchema = z.string().email('Please enter a valid email address');

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
