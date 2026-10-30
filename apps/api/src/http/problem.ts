import { STATUS_CODES } from 'node:http';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { AppError, NotFoundError, ValidationError } from '../application/errors';

/** Parses untrusted input with a shared schema, turning issues into a 400 with field paths. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ValidationError(
    'request.invalid',
    'Some fields are missing or invalid.',
    result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id cannot exist, so it is a 404 rather than a 400. */
export function idParam(value: string, code: string, message: string): string {
  if (!UUID.test(value)) throw new NotFoundError(code, message);
  return value;
}

export function sendProblem(
  reply: FastifyReply,
  status: number,
  code: string,
  detail: string,
  errors?: readonly { path: string; message: string }[],
): FastifyReply {
  return reply
    .status(status)
    .type('application/problem+json')
    .send({
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail,
      code,
      ...(errors && errors.length > 0 ? { errors } : {}),
    });
}

/** Every error leaves the API as RFC 9457 problem details. Unexpected ones never leak internals. */
export function handleError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof AppError) {
    return sendProblem(reply, error.status, error.code, error.message, error.errors);
  }
  if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
    const code = error.statusCode === 429 ? 'request.rate_limited' : 'request.malformed';
    return sendProblem(reply, error.statusCode, code, error.message);
  }
  request.log.error({ err: error }, 'Unhandled error');
  return sendProblem(reply, 500, 'server.error', 'Something went wrong on our side. Try again.');
}
