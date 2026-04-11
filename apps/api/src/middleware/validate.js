import { ZodObject } from 'zod';
import { AppError } from '../utils/errors';
export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error && error.name === 'ZodError') {
                const issues = error.errors || error.issues || [];
                next(new AppError(issues.map((e) => e.message).join(', '), 400, issues));
            }
            else {
                next(error);
            }
        }
    };
};
