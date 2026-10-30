import { ProblemSchema, type Problem } from '@tally/shared';
import type { z } from 'zod';

/** A non-2xx response, carrying the API's RFC 9457 problem details when it sent them. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem | undefined,
  ) {
    super(problem?.detail ?? `The server responded with ${String(status)}.`);
    this.name = 'ApiError';
  }

  get code(): string | undefined {
    return this.problem?.code;
  }
}

interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'DELETE';
  readonly body?: unknown;
  readonly signal?: AbortSignal | undefined;
}

async function send(
  path: string,
  { method = 'GET', body, signal }: RequestOptions,
): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const init: RequestInit = { method, headers, signal: signal ?? null };
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await fetch(new URL(`/api${path}`, window.location.origin), init);
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    const problem = ProblemSchema.safeParse(payload);
    throw new ApiError(response.status, problem.success ? problem.data : undefined);
  }
  return response;
}

/**
 * Every response is checked against the shared contract, so an API change surfaces here as one
 * clear error rather than as undefined values deep inside a component.
 */
export async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  options: RequestOptions = {},
): Promise<z.infer<T>> {
  const response = await send(path, options);
  return schema.parse(await response.json());
}

export async function requestWithoutContent(path: string, options: RequestOptions): Promise<void> {
  await send(path, options);
}
