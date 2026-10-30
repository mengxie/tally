import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { expenses, ids } from './fixtures';
import { renderAt } from './render';
import { server } from './server';

function captureExpense() {
  const captured: { body?: unknown } = {};
  server.use(
    http.post('*/api/groups/:groupId/expenses', async ({ request }) => {
      captured.body = await request.json();
      return HttpResponse.json(expenses[0], { status: 201 });
    }),
  );
  return captured;
}

describe('Adding an expense', () => {
  it('previews an even split to the cent, exactly as the server will split it', async () => {
    const captured = captureExpense();
    const { user } = renderAt(`/groups/${ids.group}`);
    const form = await screen.findByRole('form', { name: 'Add an expense' });

    await user.type(within(form).getByLabelText('What was it for?'), 'Groceries');
    await user.type(within(form).getByLabelText('Amount'), '100');

    expect(within(form).getByText('$33.34')).toBeInTheDocument();
    expect(within(form).getAllByText('$33.33')).toHaveLength(2);

    await user.click(within(form).getByRole('button', { name: 'Add expense' }));
    await expect
      .poll(() => captured.body)
      .toEqual({
        description: 'Groceries',
        amountCents: 10_000,
        paidBy: ids.aroha,
        split: { type: 'equal', memberIds: [ids.aroha, ids.sam, ids.mere] },
      });
    expect(within(form).getByLabelText('What was it for?')).toHaveValue('');
  });

  it('insists that amounts per person add up to the total', async () => {
    const captured = captureExpense();
    const { user } = renderAt(`/groups/${ids.group}`);
    const form = await screen.findByRole('form', { name: 'Add an expense' });

    await user.type(within(form).getByLabelText('What was it for?'), 'Concert tickets');
    await user.type(within(form).getByLabelText('Amount'), '90');
    await user.click(within(form).getByLabelText('By amount'));
    await user.type(within(form).getByLabelText('Sam'), '45');
    await user.click(within(form).getByRole('button', { name: 'Add expense' }));

    expect(
      await within(form).findByText('The shares must add up to the total.'),
    ).toBeInTheDocument();
    expect(captured.body).toBeUndefined();

    await user.type(within(form).getByLabelText('Mere'), '45');
    await user.click(within(form).getByRole('button', { name: 'Add expense' }));
    await expect
      .poll(() => captured.body)
      .toMatchObject({
        amountCents: 9_000,
        split: {
          type: 'exact',
          shares: [
            { memberId: ids.sam, amountCents: 4_500 },
            { memberId: ids.mere, amountCents: 4_500 },
          ],
        },
      });
  });

  it('shows the server’s explanation when it rejects the expense', async () => {
    server.use(
      http.post('*/api/groups/:groupId/expenses', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Bad Request',
            status: 400,
            detail: 'The person who paid is not in this group.',
            code: 'member.not_in_group',
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderAt(`/groups/${ids.group}`);
    const form = await screen.findByRole('form', { name: 'Add an expense' });

    await user.type(within(form).getByLabelText('What was it for?'), 'Taxi');
    await user.type(within(form).getByLabelText('Amount'), '12.50');
    await user.click(within(form).getByRole('button', { name: 'Add expense' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'The person who paid is not in this group.',
    );
  });
});
