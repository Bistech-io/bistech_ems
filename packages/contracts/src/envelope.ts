import { z } from 'zod';
import { errorCodeSchema } from './errors';

export const fieldErrorSchema = z
  .object({
    field: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

export type FieldError = z.infer<typeof fieldErrorSchema>;

export const errorDetailSchema = z
  .object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(fieldErrorSchema).optional(),
  })
  .strict();

export const errorEnvelopeSchema = z
  .object({
    success: z.literal(false),
    error: errorDetailSchema,
    requestId: z.string().min(1),
  })
  .strict();

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export function successEnvelopeSchema<TData extends z.ZodTypeAny>(dataSchema: TData) {
  return z
    .object({
      success: z.literal(true),
      message: z.string(),
      data: dataSchema,
      meta: z.record(z.string(), z.unknown()).nullable(),
    })
    .strict();
}

export type SuccessEnvelope<TData> = {
  success: true;
  message: string;
  data: TData;
  meta: Record<string, unknown> | null;
};
