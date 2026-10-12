import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './errors/AppError.js';

// Route Modules
import { authRouter } from './modules/auth/auth.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { categoryRouter } from './modules/categories/category.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { storageRouter } from './modules/storage/storage.controller.js';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // Health Probe
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Mount API Gateway Routers
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  app.use(`${apiPrefix}/auth`, authRouter);
  app.use(`${apiPrefix}/products`, productRouter);
  app.use(`${apiPrefix}/categories`, categoryRouter);
  app.use(`${apiPrefix}/orders`, orderRouter);
  app.use(`${apiPrefix}/storage`, storageRouter);

  // 404 Catch-All
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound(`Cannot find endpoint ${req.method} ${req.originalUrl}`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};