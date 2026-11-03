import type { ErrorCode, ErrorResponse } from '@devyard/contracts';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  CSRF_FAILED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: { path: string; message: string }[],
  ) {
    super(message);
  }
  get status(): number {
    return STATUS[this.code];
  }
}

/** Spec §17 structured error handling: every error leaves as ErrorResponse. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((req, reply) => {
    const body: ErrorResponse = {
      error: { code: 'NOT_FOUND', message: 'Route not found', requestId: req.id },
    };
    return reply.status(404).send(body);
  });

  app.setErrorHandler((err: FastifyError | ApiError | ZodError, req, reply) => {
    let apiErr: ApiError;
    if (err instanceof ApiError) apiErr = err;
    else if (err instanceof ZodError)
      apiErr = new ApiError(
        'VALIDATION_FAILED',
        'Request validation failed',
        err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    else if ((err as FastifyError).statusCode === 429)
      apiErr = new ApiError('RATE_LIMITED', 'Too many requests');
    else if ((err as FastifyError).statusCode && (err as FastifyError).statusCode! < 500)
      apiErr = new ApiError('VALIDATION_FAILED', err.message);
    else {
      req.log.error({ err }, 'unhandled error');
      apiErr = new ApiError('INTERNAL', 'Internal server error');
    }
    const body: ErrorResponse = {
      error: {
        code: apiErr.code,
        message: apiErr.message,
        requestId: req.id,
        ...(apiErr.details ? { details: apiErr.details } : {}),
      },
    };
    return reply.status(apiErr.status).send(body);
  });
}
