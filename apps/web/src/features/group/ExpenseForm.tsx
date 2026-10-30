import { zodResolver } from '@hookform/resolvers/zod';
import {
  formatMoney,
  parseAmountToCents,
  splitEvenly,
  type CreateExpenseRequest,
  type Group,
} from '@tally/shared';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useAddExpense } from '../../api/hooks';
import { describeError } from '../../components/ErrorState';

const FormSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, 'Say what it was for.')
      .max(120, 'Use 120 characters or fewer.'),
    amount: z
      .string()
      .refine((value) => (parseAmountToCents(value) ?? 0) > 0, 'Enter an amount, like 12.50.'),
    paidBy: z.string().min(1, 'Choose who paid.'),
    splitType: z.enum(['equal', 'exact']),
    participants: z.array(z.string()),
    exact: z.record(z.string(), z.string()),
  })
  .superRefine((form, ctx) => {
    if (form.splitType === 'equal') {
      if (form.participants.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['participants'],
          message: 'Choose who shares this cost.',
        });
      }
      return;
    }
    let sum = 0;
    for (const [memberId, value] of Object.entries(form.exact)) {
      if (value.trim() === '') continue;
      const cents = parseAmountToCents(value);
      if (cents === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['exact', memberId],
          message: 'Enter an amount, like 12.50.',
        });
      } else {
        sum += cents;
      }
    }
    const total = parseAmountToCents(form.amount);
    if (total !== undefined && sum !== total) {
      ctx.addIssue({
        code: 'custom',
        path: ['exactTotal'],
        message: 'The shares must add up to the total.',
      });
    }
  });

type FormValues = z.infer<typeof FormSchema>;

function toRequest(form: FormValues): CreateExpenseRequest {
  const amountCents = parseAmountToCents(form.amount) ?? 0;
  const split: CreateExpenseRequest['split'] =
    form.splitType === 'equal'
      ? { type: 'equal', memberIds: form.participants }
      : {
          type: 'exact',
          shares: Object.entries(form.exact)
            .map(([memberId, value]) => ({ memberId, amountCents: parseAmountToCents(value) ?? 0 }))
            .filter((share) => share.amountCents > 0),
        };
  return { description: form.description, amountCents, paidBy: form.paidBy, split };
}

export function ExpenseForm({ group }: { group: Group }) {
  const addExpense = useAddExpense(group.id);
  const defaults: FormValues = {
    description: '',
    amount: '',
    paidBy: group.members[0]?.id ?? '',
    splitType: 'equal',
    participants: group.members.map((member) => member.id),
    exact: Object.fromEntries(group.members.map((member) => [member.id, ''])),
  };
  const { register, handleSubmit, control, reset, setFocus, formState } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaults,
  });
  const [amount, splitType, participants, exact] = useWatch({
    control,
    name: ['amount', 'splitType', 'participants', 'exact'],
  });
  const { errors } = formState;
  const money = (cents: number) => formatMoney(cents, group.currency);

  // Live preview using the same splitting function as the server.
  const totalCents = parseAmountToCents(amount) ?? 0;
  const ordered = group.members
    .filter((member) => participants.includes(member.id))
    .map((member) => member.id);
  const preview = new Map(
    ordered.length > 0
      ? splitEvenly(totalCents, ordered).map((s) => [s.memberId, s.amountCents])
      : [],
  );
  const exactSum = Object.values(exact).reduce(
    (sum, value) => sum + (parseAmountToCents(value) ?? 0),
    0,
  );

  // mutate (not mutateAsync): a rejected request is shown from mutation state, never thrown.
  const onSubmit = handleSubmit((form) => {
    addExpense.mutate(toRequest(form), {
      onSuccess: () => {
        reset({ ...defaults, paidBy: form.paidBy });
        setFocus('description');
      },
    });
  });

  const exactTotalError = (errors as { exactTotal?: { message?: string } }).exactTotal?.message;

  return (
    <form
      className="form expense-form"
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="add-expense-heading"
    >
      <h2 id="add-expense-heading" className="section-heading">
        Add an expense
      </h2>
      <div className="form__row">
        <div className="field field--grow">
          <label htmlFor="expense-description">What was it for?</label>
          <input
            id="expense-description"
            autoComplete="off"
            placeholder="Groceries"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? 'expense-description-error' : undefined}
            {...register('description')}
          />
          {errors.description && (
            <p id="expense-description-error" className="field__error">
              {errors.description.message}
            </p>
          )}
        </div>
        <div className="field field--amount">
          <label htmlFor="expense-amount">Amount</label>
          <input
            id="expense-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
            {...register('amount')}
          />
          {errors.amount && (
            <p id="expense-amount-error" className="field__error">
              {errors.amount.message}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="expense-paid-by">Paid by</label>
          <select id="expense-paid-by" {...register('paidBy')}>
            {group.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="field">
        <legend>Split</legend>
        <div className="segmented">
          <label>
            <input type="radio" value="equal" {...register('splitType')} /> Equally
          </label>
          <label>
            <input type="radio" value="exact" {...register('splitType')} /> By amount
          </label>
        </div>
        <ul className="split-rows">
          {group.members.map((member) => (
            <li key={member.id} className="split-row">
              {splitType === 'equal' ? (
                <>
                  <label>
                    <input type="checkbox" value={member.id} {...register('participants')} />{' '}
                    {member.name}
                  </label>
                  <span className="money muted">
                    {preview.has(member.id) ? money(preview.get(member.id) ?? 0) : ''}
                  </span>
                </>
              ) : (
                <>
                  <label htmlFor={`exact-${member.id}`}>{member.name}</label>
                  <input
                    id={`exact-${member.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    className="split-row__amount"
                    {...register(`exact.${member.id}`)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {splitType === 'exact' && (
          <p className="muted">
            {money(exactSum)} of {money(totalCents)} assigned
            {totalCents > exactSum ? `, ${money(totalCents - exactSum)} to go` : ''}
          </p>
        )}
        {errors.participants && <p className="field__error">{errors.participants.message}</p>}
        {exactTotalError && <p className="field__error">{exactTotalError}</p>}
      </fieldset>

      {addExpense.isError && (
        <p className="form__error" role="alert">
          {describeError(addExpense.error)}
        </p>
      )}
      <button type="submit" className="button" disabled={addExpense.isPending}>
        {addExpense.isPending ? 'Adding expense…' : 'Add expense'}
      </button>
    </form>
  );
}
