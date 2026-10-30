import { Kysely, PostgresDialect, type Generated } from 'kysely';
import pg from 'pg';

export interface Database {
  groups: { id: string; name: string; currency: string; created_at: Date };
  members: { id: string; group_id: string; name: string; position: number };
  expenses: {
    id: string;
    group_id: string;
    description: string;
    amount_cents: number;
    paid_by: string;
    created_at: Date;
  };
  expense_shares: { expense_id: string; member_id: string; amount_cents: number };
  payments: {
    id: string;
    group_id: string;
    from_member_id: string;
    to_member_id: string;
    amount_cents: number;
    created_at: Date;
  };
  kysely_migration: { name: string; timestamp: Generated<string> };
}

export function createDatabase(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max: 10 }) }),
  });
}

/** Postgres SQLSTATE 23505, optionally for a specific constraint. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (!(error instanceof Error) || !('code' in error) || error.code !== '23505') return false;
  return constraint === undefined || ('constraint' in error && error.constraint === constraint);
}
