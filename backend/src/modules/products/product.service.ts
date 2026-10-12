import { prisma } from '../../utils/prisma.js';
import { CacheService } from '../../utils/cache.js';
import { AppError } from '../../errors/AppError.js';
import { CreateProductInput, ProductQueryInput } from './product.schema.js';
import { Prisma } from '@prisma/client';

const CATALOG_CACHE_KEY = 'catalog:products:all';
const CATALOG_CACHE_TTL = 300; // 5 minutes

export class ProductService {
  static async listProducts(query?: ProductQueryInput) {
    const isFiltered = Boolean(query?.categoryId || query?.search);

    // Read through Redis cache when fetching default catalog
    if (!isFiltered) {
      const cached = await CacheService.get(CATALOG_CACHE_KEY);
      if (cached) return cached;
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query?.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        inventory: {
          select: { quantity: true, reserved: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!isFiltered) {
      await CacheService.set(CATALOG_CACHE_KEY, products, CATALOG_CACHE_TTL);
    }

    return products;
  }

  static async getProductById(id: string) {
    const cacheKey = `product:${id}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const product = await prisma.product.findFirst({
      where: { id, isActive: true, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reserved: true } },
      },
    });

    if (!product) {
      throw AppError.notFound(`Product with ID "${id}" was not found`);
    }

    await CacheService.set(cacheKey, product, CATALOG_CACHE_TTL);
    return product;
  }

  static async createProduct(input: CreateProductInput) {
    const existing = await prisma.product.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw AppError.conflict(`Product with slug "${input.slug}" already exists`);
    }

    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw AppError.notFound(`Category with ID "${input.categoryId}" does not exist`);
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          basePrice: new Prisma.Decimal(input.basePrice),
          categoryId: input.categoryId,
          images: input.images,
          inventory: {
            create: {
              quantity: input.initialQuantity,
              reserved: 0,
            },
          },
        },
        include: {
          inventory: true,
          category: true,
        },
      });

      return created;
    });

    // Invalidate catalog cache
    await CacheService.del(CATALOG_CACHE_KEY);
    return product;
  }
}