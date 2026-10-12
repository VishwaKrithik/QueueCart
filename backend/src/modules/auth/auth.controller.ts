import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';

const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const { user, accessToken, refreshToken } = await AuthService.register(req.body, meta);

      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      res.status(201).json({
        success: true,
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const { user, accessToken, refreshToken } = await AuthService.login(req.body, meta);

      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const { user, accessToken, refreshToken } = await AuthService.googleLogin(req.body.idToken, meta);

      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies[COOKIE_NAME];
      if (!rawToken) {
        res.status(401).json({ success: false, message: 'Refresh token cookie missing' });
        return;
      }

      const meta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const { user, accessToken, refreshToken } = await AuthService.refreshTokens(rawToken, meta);

      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies[COOKIE_NAME];
      await AuthService.logout(rawToken);

      res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: { user: req.user },
    });
  }
}