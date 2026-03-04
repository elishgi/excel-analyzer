import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { getMonthly, patchMonthly, closeMonthly } from '../controllers/dashboard.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/monthly', getMonthly);
router.patch('/monthly/cell', patchMonthly);
router.post('/monthly/close', closeMonthly);

export default router;
