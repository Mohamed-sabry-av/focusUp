import { Router } from 'express';
import { UsersController } from './users.controller';
import { validate } from '../../../middleware/validate';
import { OnboardingInput } from '@focusUp/shared-types';

const router = Router();

// /api/v1/users/me/onboarding
router.patch('/me/onboarding', validate(OnboardingInput), UsersController.updateOnboarding);

export default router;
