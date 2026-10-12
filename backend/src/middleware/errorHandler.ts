import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../config/logger.js';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn({
      path: req.originalUrl,
      method: req.method,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
      ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    });
    return;
  }

  // Unhandled / Operational Failures
  logger.error({
    path: req.originalUrl,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error occurred'
        : err.message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
};