import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { getBudget, patchBudgetCell, putBudget } from '../controllers/budgets.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/:monthKey', getBudget);
router.put('/:monthKey', putBudget);
router.patch('/:monthKey/cells', patchBudgetCell);

export default router;
