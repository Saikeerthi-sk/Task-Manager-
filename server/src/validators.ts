import { z } from 'zod';
import { ProjectRole, TaskStatus } from './constants';

/** Signup / password reset: min 8 chars and at least one digit. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[0-9]/, 'Password must include at least one number');

const emailSchema = z.string().trim().min(1, 'Email is required').max(255).email('Invalid email address').transform((s) => s.toLowerCase());

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Invalid or expired reset link').max(4096),
  password: passwordSchema,
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
});

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum([ProjectRole.ADMIN, ProjectRole.MEMBER]).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum([ProjectRole.ADMIN, ProjectRole.MEMBER]),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});
