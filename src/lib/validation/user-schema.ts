import { z } from 'zod';

/**
 * User roles enumeration for validation
 */
export const USER_ROLES = ['admin', 'mitglied'] as const;

/**
 * User role validation schema
 */
export const userRoleSchema = z.enum(USER_ROLES);

/**
 * Create user validation schema
 */
export const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: userRoleSchema,
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  isActive: z.boolean().optional().default(true)
});

/**
 * Update user validation schema
 */
export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100).optional(),
  role: userRoleSchema.optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  isActive: z.boolean().optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Mindestens ein Feld muss angegeben werden' }
);

/**
 * Delete user validation schema
 */
export const deleteUserSchema = z.object({
  id: z.string().cuid()
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100)
});
