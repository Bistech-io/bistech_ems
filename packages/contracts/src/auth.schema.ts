import { z } from 'zod';
import { successEnvelopeSchema } from './envelope';

export const SYSTEM_ROLE_NAMES = ['super_admin', 'hr_manager', 'dept_head', 'employee'] as const;
export const systemRoleNameSchema = z.enum(SYSTEM_ROLE_NAMES);
export type SystemRoleName = z.infer<typeof systemRoleNameSchema>;

export const ROLE_NAMES = SYSTEM_ROLE_NAMES;
export const roleNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9_]+$/);
export type RoleName = z.infer<typeof roleNameSchema>;

export const SCOPE_LEVELS = ['own', 'team', 'department', 'managed', 'org'] as const;
export const scopeLevelSchema = z.enum(SCOPE_LEVELS);
export type ScopeLevel = z.infer<typeof scopeLevelSchema>;

export const PERMISSION_KEYS = [
  'user.read',
  'user.manage',
  'role.manage',
  'audit.read',
  'org.settings.manage',
  'employee.read',
  'employee.read.sensitive',
  'employee.create',
  'employee.update',
  'employee.status.manage',
  'employee.history.read',
  'org.structure.read',
  'org.structure.manage',
  'department.head.assign',
  'attendance.self',
  'attendance.read',
  'attendance.correct',
  'task.create.self',
  'task.assign',
  'task.read',
  'task.board.team',
  'task.board.department',
  'task.work',
  'task.comment',
  'task.review',
  'task.manage',
  'team.read',
  'team.manage',
  'dashboard.read',
  'feedback.submit',
  'feedback.read',
  'feedback.manage',
] as const;

export const permissionKeySchema = z.enum(PERMISSION_KEYS);
export type PermissionKey = z.infer<typeof permissionKeySchema>;

export const ACCOUNT_STATUSES = ['active', 'invited', 'suspended', 'disabled'] as const;
export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const loginRequestSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'Username is required')
      .max(64, 'Username must be 64 characters or fewer'),
    password: z.string().min(1, 'Password is required'),
    organizationSlug: z.string().trim().min(1).optional(),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authUserSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string().min(1),
    email: z.string().email().optional(),
    name: z.string().min(1),
    accountStatus: accountStatusSchema,
  })
  .strict();

export type AuthUser = z.infer<typeof authUserSchema>;

export const permissionGrantMapSchema = z.partialRecord(permissionKeySchema, scopeLevelSchema);
export type PermissionGrantMap = z.infer<typeof permissionGrantMapSchema>;

export const authMeDataSchema = z
  .object({
    user: authUserSchema,
    employeeId: z.string().uuid().nullable(),
    roles: z.array(roleNameSchema).min(1),
    permissions: permissionGrantMapSchema,
    csrfToken: z.string().min(1),
  })
  .strict();

export type AuthMeData = z.infer<typeof authMeDataSchema>;

export const authMeResponseSchema = successEnvelopeSchema(authMeDataSchema);
export const loginResponseSchema = successEnvelopeSchema(authMeDataSchema);
export const refreshResponseSchema = successEnvelopeSchema(authMeDataSchema);
export const logoutResponseSchema = successEnvelopeSchema(z.null());

export const resetPasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128).optional(),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be 128 characters or fewer'),
  })
  .strict();

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export const resetPasswordResponseSchema = successEnvelopeSchema(z.null());

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required')
      .max(128, 'Current password must be 128 characters or fewer'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be 128 characters or fewer'),
  })
  .strict();

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export const changePasswordResponseSchema = successEnvelopeSchema(z.null());

