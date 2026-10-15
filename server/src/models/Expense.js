import mongoose from 'mongoose';
import { EXPENSE_CATEGORY_VALUES } from '@tripplanner/shared';
import { cleanJSON } from './toJSON.js';

/**
 * Part 15 — one expense (or a settlement: "Aman paid Neha back") of a trip.
 * Money in PAISE (whole numbers). People are the trip's members (trip.members[].id), not user accounts.
 * Checked with the shared ExpenseInputSchema / SettlementInputSchema before it gets here.
 */
const shareSchema = new mongoose.Schema({ memberId: { type: String, required: true }, amountPaise: { type: Number, required: true, min: 0 } }, { _id: false });

const expenseSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['expense', 'settlement'], default: 'expense' },
    description: { type: String, trim: true, maxlength: 120, default: '' },
    amountPaise: { type: Number, required: true, min: 1 },
    category: { type: String, enum: [...EXPENSE_CATEGORY_VALUES, null], default: null },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    paidBy: { type: String, required: true },
    split: {
      mode: { type: String, enum: ['equal', 'exact'], required: true },
      members: { type: [String], default: undefined },
      shares: { type: [shareSchema], default: undefined },
    },
    note: { type: String, trim: true, maxlength: 300 },
  },
  {
    timestamps: true,
    toJSON: cleanJSON((ret) => {
      ret.tripId = String(ret.trip);
      delete ret.trip;
      delete ret.owner;
    }),
  },
);

expenseSchema.index({ trip: 1, owner: 1, date: -1, createdAt: -1 });

export const Expense = mongoose.models.Expense ?? mongoose.model('Expense', expenseSchema);
export default Expense;
