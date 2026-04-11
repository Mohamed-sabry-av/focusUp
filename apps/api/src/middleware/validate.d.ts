import type { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';
export declare const validate: (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
