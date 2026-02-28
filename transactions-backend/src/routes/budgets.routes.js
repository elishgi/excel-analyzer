import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { getBudget, putBudget } from '../controllers/budgets.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/:monthKey', getBudget);
router.put('/:monthKey', putBudget);

export default router;
