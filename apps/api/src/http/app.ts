import { existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { GroupService } from '../application/group-service';
import { handleError, sendProblem } from './problem';
import { groupRoutes } from './routes';

export interface AppOptions {
  readonly service: GroupService;
  /** Throws when a dependency (the database) is unavailable. */
  readonly checkReadiness: () => Promise<void>;
  readonly logger?: FastifyServerOptions['logger'];
  /** Built web app to serve, so production is one origin: no CORS, one container. */
  readonly webDistDir?: string | undefined;
  readonly rateLimitPerMinute?: number;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, trustProxy: true, bodyLimit: 64 * 1024 });

  await app.register(helmet);
  await app.register(rateLimit, { max: options.rateLimitPerMinute ?? 300, timeWindow: '1 minute' });
  app.setErrorHandler(handleError);

  app.get('/api/health', async (request, reply) => {
    try {
      await options.checkReadiness();
      return { status: 'ok' };
    } catch (error) {
      request.log.warn({ err: error }, 'Readiness check failed');
      return sendProblem(reply, 503, 'server.unavailable', 'The database is not reachable.');
    }
  });
  await app.register(groupRoutes(options.service), { prefix: '/api' });

  const webDir = options.webDistDir;
  const servesWeb = webDir !== undefined && existsSync(join(webDir, 'index.html'));
  if (servesWeb) {
    await app.register(fastifyStatic, {
      root: webDir,
      setHeaders(response, path) {
        // Vite fingerprints everything under assets/, so it can be cached forever.
        const immutable = path.includes(`${sep}assets${sep}`);
        void response.header(
          'cache-control',
          immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    });
  }

  app.setNotFoundHandler((request, reply) => {
    if (servesWeb && request.method === 'GET' && !request.url.startsWith('/api/')) {
      // Client-side routes such as /groups/:id are handled by the single-page app.
      return reply.header('cache-control', 'no-cache').sendFile('index.html');
    }
    return sendProblem(
      reply,
      404,
      'route.not_found',
      `There is no ${request.method} ${request.url}.`,
    );
  });

  return app;
}
