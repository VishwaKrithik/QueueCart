import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { Role } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';

const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

const router = Router();

// Public: Get categories
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// Admin: Create category
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: CreateCategorySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.category.findUnique({
        where: { slug: req.body.slug },
      });
      if (existing) {
        throw AppError.conflict('Category with this slug already exists');
      }

      const category = await prisma.category.create({ data: req.body });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }
);

export { router as categoryRouter };