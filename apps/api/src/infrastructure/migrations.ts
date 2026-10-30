import { type Kysely, sql } from 'kysely';
import { type Migration, Migrator } from 'kysely/migration';
import type { Database } from './database';

/**
 * Migrations live in code so they are bundled with the API. Kysely records applied migrations
 * and takes a lock, so several instances can start at once. Never edit a released migration.
 */
const migrations: Record<string, Migration> = {
  '0001_initial': {
    async up(db: Kysely<unknown>) {
      await sql`
        CREATE TABLE groups (
          id         uuid        PRIMARY KEY,
          name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
          currency   char(3)     NOT NULL,
          created_at timestamptz NOT NULL
        )`.execute(db);
      await sql`
        CREATE TABLE members (
          id       uuid    PRIMARY KEY,
          group_id uuid    NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
          name     text    NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
          position integer NOT NULL,
          UNIQUE (group_id, position),
          UNIQUE (group_id, id)
        )`.execute(db);
      await sql`CREATE UNIQUE INDEX members_group_name_unique ON members (group_id, lower(name))`.execute(
        db,
      );
      // Composite foreign keys make "the payer belongs to this group" a database guarantee too.
      await sql`
        CREATE TABLE expenses (
          id           uuid        PRIMARY KEY,
          group_id     uuid        NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
          description  text        NOT NULL CHECK (char_length(description) BETWEEN 1 AND 120),
          amount_cents integer     NOT NULL CHECK (amount_cents > 0),
          paid_by      uuid        NOT NULL,
          created_at   timestamptz NOT NULL,
          FOREIGN KEY (group_id, paid_by) REFERENCES members (group_id, id)
        )`.execute(db);
      await sql`CREATE INDEX expenses_group_newest ON expenses (group_id, created_at DESC, id DESC)`.execute(
        db,
      );
      await sql`
        CREATE TABLE expense_shares (
          expense_id   uuid    NOT NULL REFERENCES expenses (id) ON DELETE CASCADE,
          member_id    uuid    NOT NULL REFERENCES members (id),
          amount_cents integer NOT NULL CHECK (amount_cents >= 0),
          PRIMARY KEY (expense_id, member_id)
        )`.execute(db);
      await sql`
        CREATE TABLE payments (
          id             uuid        PRIMARY KEY,
          group_id       uuid        NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
          from_member_id uuid        NOT NULL,
          to_member_id   uuid        NOT NULL,
          amount_cents   integer     NOT NULL CHECK (amount_cents > 0),
          created_at     timestamptz NOT NULL,
          CHECK (from_member_id <> to_member_id),
          FOREIGN KEY (group_id, from_member_id) REFERENCES members (group_id, id),
          FOREIGN KEY (group_id, to_member_id) REFERENCES members (group_id, id)
        )`.execute(db);
      await sql`CREATE INDEX payments_group_newest ON payments (group_id, created_at DESC, id DESC)`.execute(
        db,
      );
    },
  },
};

export async function migrateToLatest(db: Kysely<Database>): Promise<string[]> {
  const migrator = new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  });
  const { error, results = [] } = await migrator.migrateToLatest();
  if (error) throw new Error('Database migration failed.', { cause: error });
  return results
    .filter((result) => result.status === 'Success')
    .map((result) => result.migrationName);
}
