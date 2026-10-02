import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../../utils/errors';
import { WebhooksService } from './webhooks.service';

export class WebhooksController {
  /**
   * POST /webhooks/livekit
   * The body is the raw text LiveKit signed; it must not be parsed before it is verified.
   */
  static async livekit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!Buffer.isBuffer(req.body)) throw new AppError('Expected a raw body', 400);

      const event = await WebhooksService.verifyLivekitEvent(
        req.body.toString('utf8'),
        req.get('Authorization'),
      );
      await WebhooksService.handleLivekitEvent(event);

      res.status(200).json({ statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
