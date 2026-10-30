import { describe } from 'vitest';
import { createDatabase } from '../src/infrastructure/database';
import { migrateToLatest } from '../src/infrastructure/migrations';
import { PostgresGroupRepository } from '../src/infrastructure/postgres-group-repository';
import { InMemoryGroupRepository } from './in-memory-group-repository';
import { describeRepositoryContract } from './repository-contract';
import { afterAll, beforeAll } from 'vitest';

describeRepositoryContract('in-memory', () => new InMemoryGroupRepository());

// Runs against a real database whenever DATABASE_URL is set (always in CI).
const databaseUrl = process.env['DATABASE_URL'];
describe.skipIf(!databaseUrl)('PostgreSQL', () => {
  const db = createDatabase(databaseUrl ?? '');
  beforeAll(async () => {
    await migrateToLatest(db);
    await migrateToLatest(db); // idempotent
  });
  afterAll(async () => {
    await db.destroy();
  });
  describeRepositoryContract('postgres', () => new PostgresGroupRepository(db));
});
