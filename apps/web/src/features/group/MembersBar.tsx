import { MemberNameSchema, type Group } from '@tally/shared';
import { useState, type SyntheticEvent } from 'react';
import { useAddMember } from '../../api/hooks';
import { describeError } from '../../components/ErrorState';

export function MembersBar({ group }: { group: Group }) {
  const addMember = useAddMember(group.id);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = MemberNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a name.');
      return;
    }
    addMember.mutate(parsed.data, {
      onSuccess: () => {
        setName('');
        setError(null);
        setAdding(false);
      },
      onError: (failure) => {
        setError(describeError(failure));
      },
    });
  };

  return (
    <div className="members">
      <ul className="members__list" aria-label="People in this group">
        {group.members.map((member) => (
          <li key={member.id}>{member.name}</li>
        ))}
      </ul>
      {adding ? (
        <form className="members__add" onSubmit={submit} noValidate>
          <label htmlFor="new-member" className="visually-hidden">
            Name
          </label>
          <input
            id="new-member"
            value={name}
            autoFocus
            autoComplete="off"
            placeholder="Name"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'new-member-error' : undefined}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <button type="submit" className="button button--small" disabled={addMember.isPending}>
            Add person
          </button>
          <button
            type="button"
            className="button button--small button--quiet"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
          >
            Cancel
          </button>
          {error && (
            <p id="new-member-error" className="field__error">
              {error}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          className="button button--small button--quiet"
          onClick={() => {
            setAdding(true);
          }}
        >
          Add person
        </button>
      )}
    </div>
  );
}
