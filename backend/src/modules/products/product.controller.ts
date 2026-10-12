import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service.js';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await ProductService.listProducts(req.query as any);
      res.status(200).json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getProductById(req.params.id);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.createProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
}