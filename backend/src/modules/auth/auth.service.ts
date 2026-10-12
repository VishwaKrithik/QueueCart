import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../errors/AppError.js';
import {
  hashValue,
  compareHash,
  generateSecureRandomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './auth.utils.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { Role } from '@prisma/client';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  private static REFRESH_COOKIE_EXPIRY_DAYS = 7;

  static async register(input: RegisterInput, meta: { ipAddress?: string; userAgent?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    const passwordHash = await hashValue(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.CUSTOMER,
      },
    });

    return this.createAuthSession(user.id, user.email, user.role, meta);
  }

  static async login(input: LoginInput, meta: { ipAddress?: string; userAgent?: string }) {
    const user = await prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const matches = await compareHash(input.password, user.passwordHash);
    if (!matches) {
      throw AppError.unauthorized('Invalid email or password');
    }

    return this.createAuthSession(user.id, user.email, user.role, meta);
  }

  static async googleLogin(idToken: string, meta: { ipAddress?: string; userAgent?: string }) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw AppError.badRequest('Invalid Google authorization payload');
    }

    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          firstName: payload.given_name || 'Google',
          lastName: payload.family_name || 'User',
          googleId: payload.sub,
          isVerified: payload.email_verified || false,
          role: Role.CUSTOMER,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, isVerified: true },
      });
    }

    return this.createAuthSession(user.id, user.email, user.role, meta);
  }

  static async refreshTokens(rawRefreshToken: string, meta: { ipAddress?: string; userAgent?: string }) {
    const payload = verifyRefreshToken(rawRefreshToken);

    const session = await prisma.session.findUnique({
      where: { refreshToken: rawRefreshToken },
      include: { user: true },
    });

    if (!session || session.userId !== payload.userId || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      throw AppError.unauthorized('Session expired or revoked');
    }

    // Refresh Token Rotation (RTR): Invalidate old session and generate new tokens
    await prisma.session.delete({ where: { id: session.id } });

    return this.createAuthSession(session.user.id, session.user.email, session.user.role, meta);
  }

  static async logout(refreshToken?: string) {
    if (refreshToken) {
      await prisma.session.deleteMany({
        where: { refreshToken },
      });
    }
  }

  private static async createAuthSession(
    userId: string,
    email: string,
    role: Role,
    meta: { ipAddress?: string; userAgent?: string }
  ) {
    const refreshTokenString = signRefreshToken({ userId, email, role });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_COOKIE_EXPIRY_DAYS);

    const session = await prisma.session.create({
      data: {
        userId,
        refreshToken: refreshTokenString,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({
      userId,
      email,
      role,
      sessionId: session.id,
    });

    return {
      user: { id: userId, email, role },
      accessToken,
      refreshToken: refreshTokenString,
    };
  }
}