import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderService } from './order.service.js';

export const CheckoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  shippingAddress: z.record(z.unknown()),
  billingAddress: z.record(z.unknown()),
});

export class OrderController {
  static async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.checkout({
        userId: req.user!.userId,
        items: req.body.items,
        shippingAddress: req.body.shippingAddress,
        billingAddress: req.body.billingAddress,
      });

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
}