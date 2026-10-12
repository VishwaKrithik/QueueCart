import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { AppError } from '../../errors/AppError.js';

const isLocalStack = Boolean(process.env.AWS_S3_ENDPOINT);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: isLocalStack, // Necessary for LocalStack routing
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface PresignedUrlResult {
  uploadUrl: string;
  fileKey: string;
  cdnUrl: string;
}

export class StorageService {
  static async getPresignedUploadUrl(
    filename: string,
    fileType: string,
    fileSizeBytes: number,
    userId: string
  ): Promise<PresignedUrlResult> {
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      throw AppError.badRequest('Invalid file format. Only JPEG, PNG, and WebP images are allowed.');
    }

    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw AppError.badRequest('File size exceeds the 5MB maximum threshold.');
    }

    const ext = path.extname(filename) || `.${fileType.split('/')[1]}`;
    const hash = crypto.randomBytes(16).toString('hex');
    const fileKey = `products/${userId}/${Date.now()}-${hash}${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        'uploaded-by': userId,
      },
    });

    const expiresIn = Number(process.env.AWS_S3_PRESIGNED_URL_EXPIRES_IN) || 300;
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    const cdnUrl = isLocalStack
      ? `${process.env.AWS_S3_ENDPOINT}/${process.env.AWS_S3_BUCKET_NAME}/${fileKey}`
      : `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    return { uploadUrl, fileKey, cdnUrl };
  }
}