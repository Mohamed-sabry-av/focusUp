import { z } from 'zod';

// ENUMS
export enum SessionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum PlanTier {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM'
}

export enum Category {
  CODING = 'CODING',
  WRITING = 'WRITING',
  STUDYING = 'STUDYING',
  DESIGN = 'DESIGN',
  ADMIN = 'ADMIN',
  OTHER = 'OTHER'
}

export enum ReportReason {
  NO_SHOW = 'NO_SHOW',
  INAPPROPRIATE = 'INAPPROPRIATE',
  HARASSMENT = 'HARASSMENT',
  SPAM = 'SPAM',
  OTHER = 'OTHER'
}

export enum ReportStatus {
  OPEN = 'OPEN',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

// ZOD SCHEMAS

export const RegisterInput = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const OnboardingInput = z.object({
  timezone: z.string(),
  categories: z.array(z.nativeEnum(Category)).min(1, 'Select at least one category'),
  preferredLength: z.array(z.number()).min(1, 'Select at least one preferred length'),
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;

export const CreateSessionInput = z.object({
  durationMin: z.number().int().positive(),
  scheduledAt: z.string().datetime(),
  category: z.nativeEnum(Category).optional(),
  goal: z.string().optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInput>;

export const CreateReflectionInput = z.object({
  sessionId: z.string().cuid(),
  text: z.string().min(1, 'Reflection text is required'),
  rating: z.number().int().min(1).max(5).optional(),
});
export type CreateReflectionInput = z.infer<typeof CreateReflectionInput>;

export const CreateReportInput = z.object({
  reportedId: z.string().cuid(),
  sessionId: z.string().cuid().optional(),
  reason: z.nativeEnum(ReportReason),
  description: z.string().optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportInput>;

export const CreateBlockInput = z.object({
  blockedId: z.string().cuid(),
});
export type CreateBlockInput = z.infer<typeof CreateBlockInput>;

// API RESPONSE WRAPPERS

export interface ApiResponse<T> {
  data?: T;
  message?: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
