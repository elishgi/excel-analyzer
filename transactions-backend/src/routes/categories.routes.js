import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { listCategories, createCategory, patchCategory, deleteCategory } from '../controllers/categories.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', listCategories);
router.post('/', createCategory);
router.patch('/:id', patchCategory);
router.delete('/:id', deleteCategory);

export default router;
