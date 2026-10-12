import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  sessionId?: string;
}

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const hashValue = async (val: string): Promise<string> => {
  return bcrypt.hash(val, 12);
};

export const compareHash = async (val: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(val, hash);
};

export const generateSecureRandomToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: '15m',
    issuer: 'ecommerce-api',
  });
};

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'ecommerce-api',
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET, { issuer: 'ecommerce-api' }) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET, { issuer: 'ecommerce-api' }) as TokenPayload;
};