import { Router } from 'express';
import { ProductController } from './product.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { CreateProductSchema, ProductQuerySchema } from './product.schema.js';
import { Role } from '@prisma/client';

const router = Router();

// Public catalog routes
router.get('/', validate({ query: ProductQuerySchema }), ProductController.list);
router.get('/:id', ProductController.getById);

// Admin product creation
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: CreateProductSchema }),
  ProductController.create
);

export { router as productRouter };