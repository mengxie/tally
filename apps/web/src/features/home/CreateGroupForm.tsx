import { zodResolver } from '@hookform/resolvers/zod';
import { CreateGroupRequestSchema, CURRENCIES, MAX_MEMBERS } from '@tally/shared';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { useCreateGroup } from '../../api/hooks';
import { describeError } from '../../components/ErrorState';

// The form edits rows of objects; the shared API schema then validates the request it becomes,
// so the browser and the server apply exactly the same rules.
const FormSchema = z
  .object({
    name: z.string(),
    currency: z.enum(CURRENCIES),
    members: z.array(z.object({ name: z.string() })),
  })
  .transform((form) => ({ ...form, members: form.members.map((member) => member.name) }))
  .pipe(CreateGroupRequestSchema);

type FormInput = z.input<typeof FormSchema>;
type FormOutput = z.output<typeof FormSchema>;

export function CreateGroupForm() {
  const navigate = useNavigate();
  const createGroup = useCreateGroup();
  const { register, control, handleSubmit, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: '', currency: 'NZD', members: [{ name: '' }, { name: '' }] },
  });
  const members = useFieldArray({ control, name: 'members' });
  const { errors } = formState;
  const membersError = errors.members?.root?.message ?? errors.members?.message;

  // mutate (not mutateAsync): a rejected request is shown from mutation state, never thrown.
  const onSubmit = handleSubmit((request) => {
    createGroup.mutate(request, { onSuccess: (group) => void navigate(`/groups/${group.id}`) });
  });

  return (
    <form className="form create-group" onSubmit={onSubmit} noValidate>
      <div className="form__row">
        <div className="field field--grow">
          <label htmlFor="group-name">Group name</label>
          <input
            id="group-name"
            placeholder="Flat 4, or Wānaka trip"
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'group-name-error' : undefined}
            {...register('name')}
          />
          {errors.name && (
            <p id="group-name-error" className="field__error">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="group-currency">Currency</label>
          <select id="group-currency" {...register('currency')}>
            {CURRENCIES.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="field">
        <legend>Who’s in</legend>
        <ul className="member-rows">
          {members.fields.map((field, index) => {
            const error =
              errors.members?.[index]?.message ?? errors.members?.[index]?.name?.message;
            const id = `member-${String(index)}`;
            return (
              <li key={field.id} className="member-row">
                <label htmlFor={id} className="visually-hidden">
                  Person {index + 1}
                </label>
                <input
                  id={id}
                  placeholder={index === 0 ? 'Your name' : 'Their name'}
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                  {...register(`members.${index}.name`)}
                />
                {members.fields.length > 2 && (
                  <button
                    type="button"
                    className="button button--quiet"
                    aria-label={`Remove person ${String(index + 1)}`}
                    onClick={() => {
                      members.remove(index);
                    }}
                  >
                    Remove
                  </button>
                )}
                {error && (
                  <p id={`${id}-error`} className="field__error">
                    {error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {membersError && <p className="field__error">{membersError}</p>}
        {members.fields.length < MAX_MEMBERS && (
          <button
            type="button"
            className="button button--quiet"
            onClick={() => {
              members.append({ name: '' });
            }}
          >
            Add another person
          </button>
        )}
      </fieldset>

      {createGroup.isError && (
        <p className="form__error" role="alert">
          {describeError(createGroup.error)}
        </p>
      )}
      <button type="submit" className="button" disabled={createGroup.isPending}>
        {createGroup.isPending ? 'Creating group…' : 'Create group'}
      </button>
    </form>
  );
}
