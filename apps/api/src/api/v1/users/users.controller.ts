import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { OnboardingInput } from '@focusUp/shared-types';

export class UsersController {
  static async updateOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data = req.body as typeof OnboardingInput._type;
      const user = await UsersService.updateOnboarding(req.user.id, data);

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}
