import express from 'express';
import {
  ExpenseInputSchema,
  RegenerateDaySchema,
  SaveTripSchema,
  SavedTripMapSchema,
  SettlementInputSchema,
  ShareSettingsSchema,
  TripMembersSchema,
  TripPdfSchema,
  TripPreferencesSchema,
  UpdateTripSchema,
} from '@tripplanner/shared';
import { expenseController } from '../controllers/expenseController.js';
import { mapController } from '../controllers/mapController.js';
import { shareController } from '../controllers/shareController.js';
import { tripController } from '../controllers/tripController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter, exportLimiter, mapLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();

// Every trip route needs a logged-in user (generation uses AI quota, Part 6 adds a per-user limit).
router.use(requireAuth);

// Accept: text/event-stream → live progress + days as they are written (Part 9); otherwise one JSON answer.
router.post('/generate', aiLimiter, validateBody(TripPreferencesSchema), tripController.generate);
router.post('/regenerate-day', aiLimiter, validateBody(RegenerateDaySchema), tripController.regenerateDay);
router.post('/pdf', exportLimiter, validateBody(TripPdfSchema), shareController.tripPdf); // Part 14: PDF of the plan on screen
router.post('/', validateBody(SaveTripSchema), tripController.save);
router.get('/', tripController.getAll);
router.get('/:id', tripController.getById);
router.put('/:id', validateBody(UpdateTripSchema), tripController.update);
router.delete('/:id', tripController.remove);
router.post('/:id/map', mapLimiter, validateBody(SavedTripMapSchema), mapController.tripMap);
router.get('/:id/share', shareController.getShare);
router.put('/:id/share', validateBody(ShareSettingsSchema), shareController.setShare);

// Part 15: expenses, people, settling up (answers are always the whole ledger)
router.get('/:id/expenses', expenseController.ledger);
router.post('/:id/expenses', validateBody(ExpenseInputSchema), expenseController.add);
router.put('/:id/expenses/:expenseId', validateBody(ExpenseInputSchema), expenseController.update);
router.delete('/:id/expenses/:expenseId', expenseController.remove);
router.post('/:id/settlements', validateBody(SettlementInputSchema), expenseController.settle);
router.put('/:id/members', validateBody(TripMembersSchema), expenseController.members);

export default router;
