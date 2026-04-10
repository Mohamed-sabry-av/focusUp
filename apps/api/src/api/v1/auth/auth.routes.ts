import { Router } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { validate } from '../../../middleware/validate';
import { RegisterInput, LoginInput } from '@focusUp/shared-types';
import { authMiddleware, requireAuth } from '../../../middleware/auth';

const router = Router();

const resendLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10 : 1,
  message: { error: 'Too many requests, please try again later.', statusCode: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', validate(RegisterInput), AuthController.register);
router.post('/login', validate(LoginInput), AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);

router.get('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', authMiddleware, requireAuth, resendLimiter, AuthController.resendVerification);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), AuthController.googleCallback);

export default router;
