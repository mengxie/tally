import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ids, summary } from './fixtures';
import { renderAt } from './render';
import { server } from './server';

describe('Group page', () => {
  it('shows who pays whom, and everyone’s balance', async () => {
    renderAt(`/groups/${ids.group}`);

    const receipt = await screen.findByRole('region', { name: 'Settle up' });
    expect(within(receipt).getByText('Sam pays Aroha')).toBeInTheDocument();
    expect(within(receipt).getByText('Mere pays Aroha')).toBeInTheDocument();
    expect(within(receipt).getByText('gets back $400.00')).toBeInTheDocument();
    expect(within(receipt).getByText('2 payments settle everyone.')).toBeInTheDocument();
    expect(
      screen.getByText('Bach for two nights', { selector: '.ledger__title' }),
    ).toBeInTheDocument();
  });

  it('records a suggested payment and refreshes the balances', async () => {
    let recorded: unknown;
    server.use(
      http.post('*/api/groups/:groupId/payments', async ({ request }) => {
        recorded = await request.json();
        server.use(
          http.get('*/api/groups/:groupId/summary', () =>
            HttpResponse.json({ ...summary, settlements: summary.settlements.slice(1) }),
          ),
        );
        return HttpResponse.json(
          {
            id: '5d0f0a8e-1c2b-4d3e-8f9a-0b1c2d3e4f5a',
            fromMemberId: ids.sam,
            toMemberId: ids.aroha,
            amountCents: 20_000,
            createdAt: '2026-10-30T11:00:00.000Z',
          },
          { status: 201 },
        );
      }),
    );
    const { user } = renderAt(`/groups/${ids.group}`);

    const receipt = await screen.findByRole('region', { name: 'Settle up' });
    await user.click(within(receipt).getAllByRole('button', { name: 'Mark as paid' })[0]!);

    expect(await within(receipt).findByText('One payment settles everyone.')).toBeInTheDocument();
    expect(recorded).toEqual({ fromMemberId: ids.sam, toMemberId: ids.aroha, amountCents: 20_000 });
  });

  it('asks for confirmation before removing an expense', async () => {
    let deleted = false;
    server.use(
      http.delete('*/api/groups/:groupId/expenses/:expenseId', () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderAt(`/groups/${ids.group}`);

    await user.click(await screen.findByRole('button', { name: 'Remove Bach for two nights' }));
    expect(deleted).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Delete Bach for two nights' }));

    await expect.poll(() => deleted).toBe(true);
  });

  it('explains a link to a group that does not exist', async () => {
    renderAt('/groups/00000000-0000-4000-8000-000000000000');

    expect(
      await screen.findByRole('heading', { name: 'This group doesn’t exist' }),
    ).toBeInTheDocument();
  });
});
