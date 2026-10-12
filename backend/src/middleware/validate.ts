import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodType, ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

interface RequestValidationSchema {
  body?: ZodType<any> | ZodObject<any>;
  query?: ZodType<any> | ZodObject<any>;
  params?: ZodType<any> | ZodObject<any>;
}

export const validate =
  (schema: RequestValidationSchema) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const parsedQuery = await schema.query.parseAsync(req.query);
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // In Zod v4, error.issues contains the validation issues
        const issues = error.issues ?? (error as any).errors;
        const formattedErrors = issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(AppError.unprocessable('Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };