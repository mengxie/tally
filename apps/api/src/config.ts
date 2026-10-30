import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// connection URL'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Defaults to the web app's build output next to this package. */
  WEB_DIST_DIR: z.string().optional(),
});

export type Config = z.infer<typeof EnvSchema> & { readonly webDistDir: string };

/** Fails fast at startup, with every problem listed, instead of failing later at runtime. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }
  const here = fileURLToPath(new URL('.', import.meta.url));
  return {
    ...parsed.data,
    webDistDir: parsed.data.WEB_DIST_DIR ?? resolve(here, '../../web/dist'),
  };
}
