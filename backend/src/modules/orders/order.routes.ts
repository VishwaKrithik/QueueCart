import { Router } from 'express';
import { OrderController, CheckoutSchema } from './order.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.post('/checkout', authenticate, validate({ body: CheckoutSchema }), OrderController.checkout);

export { router as orderRouter };