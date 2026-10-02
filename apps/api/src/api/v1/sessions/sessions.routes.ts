import express from 'express';
import {
  CreateSessionTaskInput,
  ReportFromRoomInput,
  SetGoalInput,
  UpdateSessionTaskInput,
} from '@focusUp/shared-types';

import { requireVerified } from '../../../middleware/require-verified';
import { validate } from '../../../middleware/validate';
import { SessionsController } from './sessions.controller';

const router = express.Router();

// Fixed paths first: they must not be read as a session id.

// POST /sessions/reflections — Create a reflection (check-out)
router.post('/reflections', SessionsController.createReflection);

// GET /sessions/upcoming — Get user's upcoming sessions
router.get('/upcoming', SessionsController.getUpcoming);

// GET /sessions/history — Get user's session history
router.get('/history', SessionsController.getHistory);

// Old paths, kept until the room page uses the ones below.
router.get('/token/:sessionId', requireVerified, SessionsController.getLivekitToken);
router.patch('/goal/:sessionId', validate(SetGoalInput), SessionsController.setGoal);
router.patch('/join/:sessionId', requireVerified, SessionsController.joinSession); // read-only now
router.patch('/complete/:sessionId', SessionsController.completeSession);
router.get('/status/:sessionId', SessionsController.getSessionStatus);

// The session room
router.get('/:sessionId', SessionsController.getRoom);
router.get('/:sessionId/token', requireVerified, SessionsController.getLivekitToken);
router.patch('/:sessionId/goal', validate(SetGoalInput), SessionsController.setGoal);
router.post('/:sessionId/complete', SessionsController.completeSession);
router.post('/:sessionId/extend', SessionsController.extend);
router.post('/:sessionId/solo', SessionsController.acceptSolo);
router.post('/:sessionId/report', validate(ReportFromRoomInput), SessionsController.reportPartner);

// Each person's own task list (at most 10)
router.get('/:sessionId/tasks', SessionsController.listTasks);
router.post('/:sessionId/tasks', validate(CreateSessionTaskInput), SessionsController.createTask);
router.patch('/:sessionId/tasks/:taskId', validate(UpdateSessionTaskInput), SessionsController.updateTask);
router.delete('/:sessionId/tasks/:taskId', SessionsController.deleteTask);

export default router;
