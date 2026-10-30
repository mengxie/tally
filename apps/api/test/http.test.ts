import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GroupSchema, GroupSummarySchema, ExpenseSchema, ProblemSchema } from '@tally/shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { GroupService } from '../src/application/group-service';
import { buildApp, type AppOptions } from '../src/http/app';
import { InMemoryGroupRepository } from './in-memory-group-repository';

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function start(overrides: Partial<AppOptions> = {}): Promise<FastifyInstance> {
  app = await buildApp({
    service: new GroupService(new InMemoryGroupRepository()),
    checkReadiness: () => Promise.resolve(),
    ...overrides,
  });
  return app;
}

async function createGroup(server: FastifyInstance) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/groups',
    payload: { name: 'Flat 4', currency: 'NZD', members: ['Aroha', 'Sam'] },
  });
  return { response, group: GroupSchema.parse(response.json()) };
}

function problem(response: { headers: Record<string, unknown>; json: () => unknown }) {
  expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
  return ProblemSchema.parse(response.json());
}

describe('Groups API', () => {
  it('creates a group: 201 with a Location header and a contract-valid body', async () => {
    const { response, group } = await createGroup(await start());
    expect(response.statusCode).toBe(201);
    expect(response.headers.location).toBe(`/api/groups/${group.id}`);
    expect(group.members.map((m) => m.name)).toEqual(['Aroha', 'Sam']);
  });

  it('returns field-level validation problems', async () => {
    const server = await start();
    const response = await server.inject({
      method: 'POST',
      url: '/api/groups',
      payload: { name: '', currency: 'XYZ', members: ['Solo'] },
    });
    const body = problem(response);
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('request.invalid');
    expect(body.errors?.map((e) => e.path)).toEqual(['name', 'currency', 'members']);
  });

  it('answers malformed JSON with a 400 problem', async () => {
    const server = await start();
    const response = await server.inject({
      method: 'POST',
      url: '/api/groups',
      headers: { 'content-type': 'application/json' },
      payload: '{"name":',
    });
    expect(response.statusCode).toBe(400);
    expect(problem(response).code).toBe('request.malformed');
  });

  it.each(['/api/groups/0f8fad5b-d9cb-469f-a165-70867728950e', '/api/groups/not-an-id'])(
    'treats %s as not found',
    async (url) => {
      const response = await (await start()).inject({ method: 'GET', url });
      expect(response.statusCode).toBe(404);
      expect(problem(response).code).toBe('group.not_found');
    },
  );

  it('runs the whole flow: expenses, summary, payment, deletion', async () => {
    const server = await start();
    const { group } = await createGroup(server);
    const [aroha, sam] = group.members.map((m) => m.id) as [string, string];
    const base = `/api/groups/${group.id}`;

    const added = await server.inject({
      method: 'POST',
      url: `${base}/expenses`,
      payload: {
        description: 'Groceries',
        amountCents: 8000,
        paidBy: aroha,
        split: { type: 'equal', memberIds: [aroha, sam] },
      },
    });
    expect(added.statusCode).toBe(201);
    const expense = ExpenseSchema.parse(added.json());

    const summary = GroupSummarySchema.parse(
      (await server.inject({ url: `${base}/summary` })).json(),
    );
    expect(summary.settlements).toEqual([
      { fromMemberId: sam, toMemberId: aroha, amountCents: 4000 },
    ]);

    const paid = await server.inject({
      method: 'POST',
      url: `${base}/payments`,
      payload: { fromMemberId: sam, toMemberId: aroha, amountCents: 4000 },
    });
    expect(paid.statusCode).toBe(201);
    expect(
      GroupSummarySchema.parse((await server.inject({ url: `${base}/summary` })).json())
        .settlements,
    ).toEqual([]);

    const deleted = await server.inject({
      method: 'DELETE',
      url: `${base}/expenses/${expense.id}`,
    });
    expect(deleted.statusCode).toBe(204);
    expect(
      (await server.inject({ method: 'DELETE', url: `${base}/expenses/${expense.id}` })).statusCode,
    ).toBe(404);
    expect((await server.inject({ url: `${base}/expenses` })).json()).toEqual([]);
  });

  it('rejects exact shares that do not add up', async () => {
    const server = await start();
    const { group } = await createGroup(server);
    const payer = group.members[0]?.id;
    const response = await server.inject({
      method: 'POST',
      url: `/api/groups/${group.id}/expenses`,
      payload: {
        description: 'Rent',
        amountCents: 1000,
        paidBy: payer,
        split: { type: 'exact', shares: [{ memberId: payer, amountCents: 999 }] },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(problem(response).errors).toEqual([
      { path: 'split.shares', message: 'The shares must add up to the total.' },
    ]);
  });

  it('answers a duplicate member with 409', async () => {
    const server = await start();
    const { group } = await createGroup(server);
    const response = await server.inject({
      method: 'POST',
      url: `/api/groups/${group.id}/members`,
      payload: { name: 'aroha' },
    });
    expect(response.statusCode).toBe(409);
    expect(problem(response).code).toBe('member.duplicate_name');
  });

  it('hides unexpected failures behind a generic 500', async () => {
    const service = new GroupService({
      findGroup: () => Promise.reject(new Error('connection refused at 10.0.0.5')),
    } as never);
    const response = await (
      await start({ service })
    ).inject({ url: '/api/groups/0f8fad5b-d9cb-469f-a165-70867728950e' });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('10.0.0.5');
  });
});

describe('Platform behaviour', () => {
  it('reports readiness, and 503 when the database is down', async () => {
    expect((await (await start()).inject({ url: '/api/health' })).json()).toEqual({ status: 'ok' });
    await app?.close();
    const down = await (
      await start({ checkReadiness: () => Promise.reject(new Error('down')) })
    ).inject({ url: '/api/health' });
    expect(down.statusCode).toBe(503);
  });

  it('rate limits with a 429 problem', async () => {
    const server = await start({ rateLimitPerMinute: 2 });
    await server.inject({ url: '/api/health' });
    await server.inject({ url: '/api/health' });
    const limited = await server.inject({ url: '/api/health' });
    expect(limited.statusCode).toBe(429);
    expect(problem(limited).code).toBe('request.rate_limited');
  });

  it('sends security headers', async () => {
    const response = await (await start()).inject({ url: '/api/health' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('serves the web app with SPA fallback and long-lived caching for hashed assets', async () => {
    const web = mkdtempSync(join(tmpdir(), 'tally-web-'));
    mkdirSync(join(web, 'assets'));
    writeFileSync(join(web, 'index.html'), '<!doctype html><title>Tally</title>');
    writeFileSync(join(web, 'assets', 'app-1a2b.js'), 'console.log(1)');
    const server = await start({ webDistDir: web });

    const deepLink = await server.inject({ url: '/groups/0f8fad5b-d9cb-469f-a165-70867728950e' });
    expect(deepLink.statusCode).toBe(200);
    expect(deepLink.body).toContain('<title>Tally</title>');
    expect(
      (await server.inject({ url: '/assets/app-1a2b.js' })).headers['cache-control'],
    ).toContain('immutable');
    const unknownApi = await server.inject({ url: '/api/nope' });
    expect(unknownApi.statusCode).toBe(404);
    expect(problem(unknownApi).code).toBe('route.not_found');
  });
});
