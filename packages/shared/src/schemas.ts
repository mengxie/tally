import { z } from 'zod';
import { CURRENCIES, MAX_AMOUNT_CENTS } from './money';

/**
 * The API contract, defined once. The API validates requests with these schemas and the web
 * app validates responses with them, so a contract change is a compile error on both sides.
 */

export const MAX_MEMBERS = 20;

export const IdSchema = z.uuid();
export const CurrencySchema = z.enum(CURRENCIES);
export const MemberNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a name.')
  .max(40, 'Use 40 characters or fewer.');
const DescriptionSchema = z
  .string()
  .trim()
  .min(1, 'Say what it was for.')
  .max(120, 'Use 120 characters or fewer.');
const AmountCentsSchema = z
  .int()
  .positive('Enter an amount above zero.')
  .max(MAX_AMOUNT_CENTS, 'That amount is too large.');

function addDuplicateIssues(
  values: readonly string[],
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string,
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) ctx.addIssue({ code: 'custom', message, path: [...path, index] });
    seen.add(key);
  });
}

// ---------------------------------------------------------------- requests

export const CreateGroupRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the group.').max(80, 'Use 80 characters or fewer.'),
    currency: CurrencySchema,
    members: z
      .array(MemberNameSchema)
      .min(2, 'Add at least two people.')
      .max(MAX_MEMBERS, `A group can have up to ${MAX_MEMBERS} people.`),
  })
  .superRefine((group, ctx) => {
    addDuplicateIssues(group.members, ctx, ['members'], 'Each person needs a different name.');
  });

export const AddMemberRequestSchema = z.object({ name: MemberNameSchema });

export const SplitSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('equal'),
    memberIds: z.array(IdSchema).min(1, 'Choose who shares this cost.'),
  }),
  z.object({
    type: z.literal('exact'),
    shares: z
      .array(
        z.object({ memberId: IdSchema, amountCents: z.int().nonnegative().max(MAX_AMOUNT_CENTS) }),
      )
      .min(1, 'Choose who shares this cost.'),
  }),
]);

export const CreateExpenseRequestSchema = z
  .object({
    description: DescriptionSchema,
    amountCents: AmountCentsSchema,
    paidBy: IdSchema,
    split: SplitSchema,
  })
  .superRefine((expense, ctx) => {
    const { split } = expense;
    if (split.type === 'equal') {
      addDuplicateIssues(split.memberIds, ctx, ['split', 'memberIds'], 'Someone is listed twice.');
      return;
    }
    addDuplicateIssues(
      split.shares.map((share) => share.memberId),
      ctx,
      ['split', 'shares'],
      'Someone is listed twice.',
    );
    const total = split.shares.reduce((sum, share) => sum + share.amountCents, 0);
    if (total !== expense.amountCents) {
      ctx.addIssue({
        code: 'custom',
        path: ['split', 'shares'],
        message: 'The shares must add up to the total.',
      });
    }
  });

export const CreatePaymentRequestSchema = z
  .object({ fromMemberId: IdSchema, toMemberId: IdSchema, amountCents: AmountCentsSchema })
  .refine((payment) => payment.fromMemberId !== payment.toMemberId, {
    message: 'Choose two different people.',
    path: ['toMemberId'],
  });

// ---------------------------------------------------------------- responses

export const MemberSchema = z.object({ id: IdSchema, name: z.string() });

export const GroupSchema = z.object({
  id: IdSchema,
  name: z.string(),
  currency: CurrencySchema,
  createdAt: z.iso.datetime(),
  members: z.array(MemberSchema),
});

export const ShareSchema = z.object({ memberId: IdSchema, amountCents: z.int().nonnegative() });

export const ExpenseSchema = z.object({
  id: IdSchema,
  description: z.string(),
  amountCents: z.int().positive(),
  paidBy: IdSchema,
  shares: z.array(ShareSchema),
  createdAt: z.iso.datetime(),
});

export const PaymentSchema = z.object({
  id: IdSchema,
  fromMemberId: IdSchema,
  toMemberId: IdSchema,
  amountCents: z.int().positive(),
  createdAt: z.iso.datetime(),
});

export const GroupSummarySchema = z.object({
  totalSpentCents: z.int().nonnegative(),
  /** Positive: the group owes this person. Negative: this person owes the group. */
  balances: z.array(z.object({ memberId: IdSchema, netCents: z.int() })),
  /** The fewest payments that settle every balance. */
  settlements: z.array(
    z.object({ fromMemberId: IdSchema, toMemberId: IdSchema, amountCents: z.int().positive() }),
  ),
});

/** RFC 9457 problem details, with a stable machine-readable code. */
export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int(),
  detail: z.string().optional(),
  code: z.string(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type CreateGroupRequest = z.input<typeof CreateGroupRequestSchema>;
export type AddMemberRequest = z.input<typeof AddMemberRequestSchema>;
export type CreateExpenseRequest = z.input<typeof CreateExpenseRequestSchema>;
export type CreatePaymentRequest = z.input<typeof CreatePaymentRequestSchema>;
export type Split = z.infer<typeof SplitSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type GroupSummary = z.infer<typeof GroupSummarySchema>;
export type Problem = z.infer<typeof ProblemSchema>;
