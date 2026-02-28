import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { getMonthly } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/monthly', getMonthly);

export default router;
