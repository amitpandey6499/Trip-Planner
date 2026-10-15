import * as expenses from '../services/expenseService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Part 15 — every answer is the trip's whole ledger: { members, expenses, balances, settlements, summary }. */
const answer = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const expenseController = {
  // GET /api/trips/:id/expenses
  ledger: asyncHandler(async (req, res) => answer(res, await expenses.getLedger(req.params.id, req.user.id))),
  // POST /api/trips/:id/expenses
  add: asyncHandler(async (req, res) => answer(res, await expenses.addExpense(req.params.id, req.user.id, req.body), 201)),
  // PUT /api/trips/:id/expenses/:expenseId
  update: asyncHandler(async (req, res) => answer(res, await expenses.updateExpense(req.params.id, req.user.id, req.params.expenseId, req.body))),
  // DELETE /api/trips/:id/expenses/:expenseId
  remove: asyncHandler(async (req, res) => answer(res, await expenses.deleteExpense(req.params.id, req.user.id, req.params.expenseId))),
  // POST /api/trips/:id/settlements
  settle: asyncHandler(async (req, res) => answer(res, await expenses.addSettlement(req.params.id, req.user.id, req.body), 201)),
  // PUT /api/trips/:id/members
  members: asyncHandler(async (req, res) => answer(res, await expenses.setMembers(req.params.id, req.user.id, req.body))),
};
