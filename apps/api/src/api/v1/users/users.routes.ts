import express from 'express';
import { UsersController } from './users.controller';
import { validate } from '../../../middleware/validate';
import { OnboardingInput } from '@focusUp/shared-types';
import { requireAuth } from '../../../middleware/auth';

const router = express.Router();

// /api/v1/users/me
router.get('/me', requireAuth, UsersController.getMe);

// /api/v1/users/me/stats
router.get('/me/stats', requireAuth, UsersController.getStats);

// /api/v1/users/me/onboarding
router.patch('/me/onboarding', requireAuth, validate(OnboardingInput), UsersController.updateOnboarding);

export default router;
