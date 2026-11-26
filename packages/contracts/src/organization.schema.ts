import { z } from 'zod';
import { successEnvelopeSchema } from './envelope';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const organizationScheduleSettingsSchema = z
  .object({
    workStart: z.string().regex(timeRegex, 'workStart must be in 24-hour HH:mm format (e.g. 09:00)'),
    graceMinutes: z.number().int().min(0).max(180),
    workEnd: z.string().regex(timeRegex, 'workEnd must be in 24-hour HH:mm format (e.g. 18:00)'),
    weekendDays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    timezone: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    allowedOfficeIps: z.array(z.string()).optional(),
    ipRestrictionEnabled: z.boolean().optional(),
    currentIp: z.string().nullable().optional(),
  })
  .strict();

export type OrganizationScheduleSettings = z.infer<typeof organizationScheduleSettingsSchema>;

export const updateOrganizationScheduleSettingsSchema = z
  .object({
    workStart: z.string().regex(timeRegex, 'workStart must be in 24-hour HH:mm format (e.g. 09:00)').optional(),
    graceMinutes: z.number().int().min(0).max(180).optional(),
    workEnd: z.string().regex(timeRegex, 'workEnd must be in 24-hour HH:mm format (e.g. 18:00)').optional(),
    timezone: z.string().min(1).optional(),
    weekendDays: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional(),
    allowedOfficeIps: z.array(z.string()).max(50).optional(),
  })
  .strict();

export type UpdateOrganizationScheduleSettings = z.infer<typeof updateOrganizationScheduleSettingsSchema>;

export const organizationScheduleResponseSchema = successEnvelopeSchema(organizationScheduleSettingsSchema);
export type OrganizationScheduleResponse = z.infer<typeof organizationScheduleResponseSchema>;

