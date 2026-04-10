import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../../middleware/validate';
import { RegisterInput, LoginInput } from '@focusUp/shared-types';

const router = Router();

router.post('/register', validate(RegisterInput), AuthController.register);
router.post('/login', validate(LoginInput), AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);

export default router;
