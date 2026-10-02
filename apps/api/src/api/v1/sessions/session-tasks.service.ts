import sanitizeHtml from 'sanitize-html';
import {
  MAX_SESSION_TASKS,
  type CreateSessionTaskInput,
  type SessionTaskDto,
  type UpdateSessionTaskInput,
} from '@focusUp/shared-types';

import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';

/** Tasks are plain text: no HTML at all. */
function cleanText(text: string): string {
  const clean = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!clean) throw new AppError('Task text cannot be empty', 400);
  return clean;
}

function toDto(task: { id: string; text: string; done: boolean; position: number }): SessionTaskDto {
  return { id: task.id, text: task.text, done: task.done, position: task.position };
}

async function assertParticipant(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { user1Id: true, user2Id: true, status: true },
  });
  if (!session) throw new AppError('Session not found', 404);
  if (session.user1Id !== userId && session.user2Id !== userId) {
    throw new AppError('You are not a participant in this session', 403);
  }
  if (session.status === 'CANCELLED' || session.status === 'NO_SHOW') {
    throw new AppError('This session has ended', 400);
  }
}

/** A person's own task list for one session (at most 10). The partner never sees it. */
export class SessionTasksService {
  static async list(sessionId: string, userId: string): Promise<SessionTaskDto[]> {
    await assertParticipant(sessionId, userId);
    const tasks = await prisma.sessionTask.findMany({
      where: { sessionId, userId },
      orderBy: { position: 'asc' },
    });
    return tasks.map(toDto);
  }

  static async create(sessionId: string, userId: string, input: CreateSessionTaskInput): Promise<SessionTaskDto> {
    await assertParticipant(sessionId, userId);
    const text = cleanText(input.text);

    const existing = await prisma.sessionTask.findMany({
      where: { sessionId, userId },
      select: { position: true },
      orderBy: { position: 'desc' },
    });
    if (existing.length >= MAX_SESSION_TASKS) {
      throw new AppError(`You can add at most ${MAX_SESSION_TASKS} tasks`, 400);
    }

    const task = await prisma.sessionTask.create({
      data: { sessionId, userId, text, position: (existing[0]?.position ?? -1) + 1 },
    });
    return toDto(task);
  }

  static async update(
    sessionId: string,
    userId: string,
    taskId: string,
    input: UpdateSessionTaskInput,
  ): Promise<SessionTaskDto> {
    await assertParticipant(sessionId, userId);
    const text = input.text === undefined ? undefined : cleanText(input.text);

    // The filter on sessionId and userId makes it impossible to touch someone else's task.
    const result = await prisma.sessionTask.updateMany({
      where: { id: taskId, sessionId, userId },
      data: { ...(text !== undefined && { text }), ...(input.done !== undefined && { done: input.done }) },
    });
    if (result.count === 0) throw new AppError('Task not found', 404);

    const task = await prisma.sessionTask.findUniqueOrThrow({ where: { id: taskId } });
    return toDto(task);
  }

  static async remove(sessionId: string, userId: string, taskId: string): Promise<void> {
    await assertParticipant(sessionId, userId);
    const result = await prisma.sessionTask.deleteMany({ where: { id: taskId, sessionId, userId } });
    if (result.count === 0) throw new AppError('Task not found', 404);
  }
}
