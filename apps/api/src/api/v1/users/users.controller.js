import { UsersService } from './users.service';
import { OnboardingInput } from '@focusUp/shared-types';
export class UsersController {
    static async getMe(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated', statusCode: 401 });
                return;
            }
            const user = await UsersService.getCurrentUser(req.user.id);
            res.status(200).json({ data: { user }, statusCode: 200 });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStats(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated', statusCode: 401 });
                return;
            }
            const stats = await UsersService.getUserStats(req.user.id);
            res.status(200).json({ data: stats, statusCode: 200 });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateOnboarding(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated', statusCode: 401 });
                return;
            }
            const data = req.body;
            const user = await UsersService.updateOnboarding(req.user.id, data);
            res.status(200).json({ data: { user }, statusCode: 200 });
        }
        catch (error) {
            next(error);
        }
    }
}
