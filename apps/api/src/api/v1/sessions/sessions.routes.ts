import { Router } from 'express';
import { SessionsController } from './sessions.controller';

const router = Router();

// GET /sessions/token/:sessionId — Generate LiveKit token for session room
router.get('/token/:sessionId', SessionsController.getLivekitToken);

// PATCH /sessions/goal/:sessionId — Set user's goal for a session
router.patch('/goal/:sessionId', SessionsController.setGoal);

// PATCH /sessions/join/:sessionId — Mark a user as joined
router.patch('/join/:sessionId', SessionsController.joinSession);

// PATCH /sessions/complete/:sessionId — Complete session
router.patch('/complete/:sessionId', SessionsController.completeSession);

// GET /sessions/status/:sessionId — Get session details/status
router.get('/status/:sessionId', SessionsController.getSessionStatus);

// POST /sessions/reflections — Create a reflection
router.post('/reflections', SessionsController.createReflection);

export default router;
