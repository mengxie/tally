import { sql } from 'kysely';
import { GroupService } from './application/group-service';
import { loadConfig } from './config';
import { buildApp } from './http/app';
import { createDatabase } from './infrastructure/database';
import { migrateToLatest } from './infrastructure/migrations';
import { PostgresGroupRepository } from './infrastructure/postgres-group-repository';

// Composition root: the only place that knows about every layer.
const config = loadConfig();
const db = createDatabase(config.DATABASE_URL);

const app = await buildApp({
  service: new GroupService(new PostgresGroupRepository(db)),
  checkReadiness: async () => {
    await sql`SELECT 1`.execute(db);
  },
  webDistDir: config.webDistDir,
  logger:
    config.NODE_ENV === 'development'
      ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty' } }
      : { level: config.LOG_LEVEL },
});

const applied = await migrateToLatest(db);
if (applied.length > 0) app.log.info({ migrations: applied }, 'Applied database migrations');

// Graceful shutdown: stop accepting requests, finish in-flight ones, then close the pool.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'Shutting down');
    void app
      .close()
      .then(() => db.destroy())
      .then(() => process.exit(0));
  });
}

await app.listen({ host: config.HOST, port: config.PORT });
