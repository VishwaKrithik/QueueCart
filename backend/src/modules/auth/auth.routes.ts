import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { RegisterSchema, LoginSchema, GoogleOAuthSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.post('/register', validate({ body: RegisterSchema }), AuthController.register);
router.post('/login', validate({ body: LoginSchema }), AuthController.login);
router.post('/google', validate({ body: GoogleOAuthSchema }), AuthController.googleAuth);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

export { router as authRouter };