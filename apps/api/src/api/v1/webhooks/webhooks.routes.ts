import express from 'express';

import { WebhooksController } from './webhooks.controller';

const router = express.Router();

// LiveKit signs the exact bytes it sends (content type application/webhook+json), so the body stays raw.
router.post('/livekit', express.raw({ type: '*/*', limit: '1mb' }), WebhooksController.livekit);

export default router;
