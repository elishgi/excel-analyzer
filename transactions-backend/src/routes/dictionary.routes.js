import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  getRules,
  addRule,
  updateRule,
  deleteRule,
} from '../controllers/dictionary.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', getRules);
router.post('/', addRule);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);

export default router;
