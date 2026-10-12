import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(280).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case'),
  description: z.string().min(10),
  basePrice: z.number().positive('Price must be greater than 0'),
  categoryId: z.string().uuid('Invalid category ID'),
  images: z.array(z.string().url()).default([]),
  initialQuantity: z.number().int().nonnegative().default(0),
});

export const ProductQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;