import { z } from 'zod';

/** Spec §17: consistent response structures + structured error handling. */
export const ErrorCode = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'CSRF_FAILED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

/** Spec §17 / §26.3: pagination, filtering, sorting. Cursor-free offset paging for Phase 1. */
export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().optional(),
  q: z.string().max(200).optional(),
});
export type PageQuery = z.infer<typeof PageQuery>;

export const PageMeta = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const dataEnvelope = <T extends z.ZodType>(item: T) => z.object({ data: item });
export const listEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: PageMeta });

export const Id = z.string().min(1).max(64);
export const IsoDateTime = z.string().datetime();

export const HealthResponse = z.object({
  status: z.literal('ok'),
  version: z.string(),
  db: z.enum(['ok', 'error']),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
