import { Request, Response, NextFunction, Router } from 'express';
import { z } from 'zod';
import { StorageService } from './storage.service.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { Role } from '@prisma/client';

const PresignedUrlSchema = z.object({
  filename: z.string().min(1),
  fileType: z.string().min(1),
  fileSizeBytes: z.number().positive(),
});

const getUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename, fileType, fileSizeBytes } = req.body;
    const result = await StorageService.getPresignedUploadUrl(
      filename,
      fileType,
      fileSizeBytes,
      req.user!.userId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const storageRouter = Router();

// Only ADMIN users can generate upload signatures for product catalog assets
storageRouter.post(
  '/upload-url',
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: PresignedUrlSchema }),
  getUploadUrl
);

export { storageRouter };