import { z } from 'zod';
import { EXPENSE_CATEGORY_VALUES, LIMITS } from '../constants.js';
import { formatPaise } from '../expenses/money.js';
import { isoDate, optionalText, requiredText } from './common.js';

/**
 * Part 15 — bodies of the expense endpoints. All money is in PAISE (whole numbers); the form converts the
 * rupees people type with toPaise() first. People ("members") are names on the trip, not accounts.
 */

const MAX_PAISE = LIMITS.MAX_EXPENSE_RUPEES * 100;
const memberId = z.string({ error: 'Pick a person.' }).trim().min(1, 'Pick a person.').max(20);
const paise = (label) =>
  z
    .number({ error: (issue) => (issue.input === undefined ? `${label} is required.` : `${label} must be a number.`) })
    .int(`${label} can have at most 2 decimals.`)
    .min(1, `${label} must be more than ₹0.`)
    .max(MAX_PAISE, `${label} can be at most ${formatPaise(MAX_PAISE)}.`);

export const ExpenseSplitSchema = z.discriminatedUnion(
  'mode',
  [
    // Everyone listed pays the same (the leftover paise go to the first people).
    z.object({
      mode: z.literal('equal'),
      members: z.array(memberId).min(1, 'Split it with at least one person.').max(LIMITS.MAX_TRIP_MEMBERS),
    }),
    // Each person's own amount; together they must make the total.
    z.object({
      mode: z.literal('exact'),
      shares: z
        .array(z.object({ memberId, amountPaise: z.number().int().min(0, 'A share cannot be negative.').max(MAX_PAISE) }))
        .min(1, 'Add at least one share.')
        .max(LIMITS.MAX_TRIP_MEMBERS),
    }),
  ],
  { error: 'Choose how to split it.' },
);

export const ExpenseInputSchema = z
  .object({
    description: requiredText('What it was for', { max: 120 }),
    amountPaise: paise('Amount'),
    category: z.enum(EXPENSE_CATEGORY_VALUES, { error: 'Please pick a type.' }),
    date: isoDate('Date'),
    paidBy: memberId,
    split: ExpenseSplitSchema,
    note: optionalText('Note', 300).optional(),
  })
  .superRefine((e, ctx) => {
    const ids = e.split.mode === 'equal' ? e.split.members : e.split.shares.map((s) => s.memberId);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['split'], message: 'A person is listed twice in the split.' });
    if (e.split.mode === 'exact') {
      const sum = e.split.shares.reduce((total, s) => total + s.amountPaise, 0);
      if (sum !== e.amountPaise) {
        ctx.addIssue({ code: 'custom', path: ['split'], message: `The shares add up to ${formatPaise(sum)}, but the amount is ${formatPaise(e.amountPaise)}.` });
      }
    }
  });

/** "Aman paid Neha back ₹450" — recorded so the balances go to zero. */
export const SettlementInputSchema = z
  .object({
    from: memberId,
    to: memberId,
    amountPaise: paise('Amount'),
    date: isoDate('Date'),
  })
  .refine((s) => s.from !== s.to, { path: ['to'], message: 'Pick two different people.' });

/** PUT /api/trips/:id/members — the whole list (existing people keep their id, new ones get one). */
export const TripMembersSchema = z
  .object({
    members: z
      .array(z.object({ id: z.string().trim().max(20).optional(), name: requiredText('Name', { max: 40 }) }))
      .min(1, 'A trip needs at least one person.')
      .max(LIMITS.MAX_TRIP_MEMBERS, `A trip can have at most ${LIMITS.MAX_TRIP_MEMBERS} people.`),
  })
  .superRefine(({ members }, ctx) => {
    const seen = new Set();
    members.forEach((m, i) => {
      const key = m.name.toLowerCase();
      if (seen.has(key)) ctx.addIssue({ code: 'custom', path: ['members', i, 'name'], message: `"${m.name}" is in the list twice.` });
      seen.add(key);
    });
  });
