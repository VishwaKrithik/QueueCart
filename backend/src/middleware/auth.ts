import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../modules/auth/auth.utils.js';
import { Role } from '@prisma/client';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Access token expired'));
    }
    return next(AppError.unauthorized('Invalid access token'));
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions to access this resource'));
    }

    next();
  };
};