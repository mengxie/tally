import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { group } from './fixtures';
import { renderAt } from './render';
import { server } from './server';

describe('Creating a group', () => {
  it('explains what is missing without calling the API', async () => {
    const { user } = renderAt('/');

    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByText('Name the group.')).toBeInTheDocument();
    expect(screen.getAllByText('Enter a name.')).toHaveLength(2);
    expect(screen.getByLabelText('Group name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('applies the same duplicate-name rule as the server', async () => {
    const { user } = renderAt('/');

    await user.type(screen.getByLabelText('Group name'), 'Flat 4');
    await user.type(screen.getByLabelText('Person 1'), 'Sam');
    await user.type(screen.getByLabelText('Person 2'), 'sam');
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByText('Each person needs a different name.')).toBeInTheDocument();
  });

  it('creates the group and opens it', async () => {
    let sent: unknown;
    server.use(
      http.post('*/api/groups', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(group, { status: 201 });
      }),
    );
    const { user, router } = renderAt('/');

    await user.type(screen.getByLabelText('Group name'), '  Weekend in Wānaka ');
    await user.type(screen.getByLabelText('Person 1'), 'Aroha');
    await user.type(screen.getByLabelText('Person 2'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Add another person' }));
    await user.type(screen.getByLabelText('Person 3'), 'Mere');
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByRole('heading', { level: 1, name: group.name })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/groups/${group.id}`);
    expect(sent).toEqual({
      name: 'Weekend in Wānaka',
      currency: 'NZD',
      members: ['Aroha', 'Sam', 'Mere'],
    });
  });
});
