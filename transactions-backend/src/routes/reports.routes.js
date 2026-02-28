import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { getSummary, getTopMerchants } from '../controllers/reports.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/summary',       getSummary);
router.get('/top-merchants', getTopMerchants);

export default router;
