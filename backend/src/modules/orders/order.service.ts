import crypto from 'crypto';
import { redlock } from '../../config/redis.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { OrderPublisher } from './order.publisher.js';
import { CacheService } from '../../utils/cache.js';
import { logger } from '../../config/logger.js';
import { Prisma } from '@prisma/client';

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  userId: string;
  items: CheckoutItemInput[];
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
}

export class OrderService {
  static async checkout(input: CheckoutInput) {
    if (input.items.length === 0) {
      throw AppError.badRequest('Cannot checkout with an empty order');
    }

    // Sort product IDs to prevent deadlock order inversion
    const sortedProductIds = [...new Set(input.items.map((i) => i.productId))].sort();
    const lockResources = sortedProductIds.map((id) => `locks:inventory:${id}`);
    const LOCK_TTL_MS = 6000;

    let lock;
    try {
      lock = await redlock.acquire(lockResources, LOCK_TTL_MS);
    } catch {
      throw AppError.conflict('Inventory items are currently contested by another checkout. Please retry.');
    }

    try {
      // Execute transactional inventory checks and order creation
      const createdOrder = await prisma.$transaction(async (tx) => {
        let calculatedTotal = new Prisma.Decimal(0);
        const orderItemsData = [];

        for (const item of input.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId, isActive: true, deletedAt: null },
            include: { inventory: true },
          });

          if (!product || !product.inventory) {
            throw AppError.notFound(`Product with ID ${item.productId} unavailable`);
          }

          const availableStock = product.inventory.quantity - product.inventory.reserved;
          if (availableStock < item.quantity) {
            throw AppError.badRequest(
              `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`
            );
          }

          // Decrement available quantity and increment version
          await tx.inventory.update({
            where: { id: product.inventory.id },
            data: {
              quantity: { decrement: item.quantity },
              version: { increment: 1 },
            },
          });

          const lineTotal = product.basePrice.mul(item.quantity);
          calculatedTotal = calculatedTotal.add(lineTotal);

          orderItemsData.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.basePrice,
          });
        }

        const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: input.userId,
            totalAmount: calculatedTotal,
            shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
            billingAddress: input.billingAddress as Prisma.InputJsonValue,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: true,
          },
        });

        return order;
      });

      // Clear cached catalog view for affected products
      for (const id of sortedProductIds) {
        await CacheService.del(`product:${id}`);
      }

      // Publish event asynchronously to RabbitMQ
      await OrderPublisher.publishOrderCreated({
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        userId: createdOrder.userId,
        totalAmount: createdOrder.totalAmount.toString(),
        items: createdOrder.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice.toString(),
        })),
      });

      return createdOrder;
    } finally {
      try {
        await lock.release();
      } catch (err) {
        logger.warn({ err }, 'Lock auto-expired or could not be cleanly released');
      }
    }
  }
}