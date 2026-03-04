import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  uploadImport, listImports, listBatchTransactions, listUncategorized, categorizeTransaction, recategorizeBatch,
  deleteBatch, exportBatch, createDraft, getDraft, patchDraftRow, approveDraft,
} from '../controllers/imports.controller.js';
import { AppError } from '../utils/AppError.js';

const ALLOWED_MIMES = new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext !== 'xlsx') return cb(new AppError('רק קבצי Excel (.xlsx) מותרים', 400));
    if (!ALLOWED_MIMES.has(file.mimetype)) return cb(new AppError('סוג קובץ לא חוקי — נדרש application/vnd.openxmlformats', 400));
    cb(null, true);
  },
});

function handleMulterError(err, req, res, next) { if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: `הקובץ גדול מדי – מקסימום ${MAX_FILE_SIZE / 1024 / 1024}MB`, details: null }); if (err?.statusCode) return next(err); next(err); }

const router = Router();
router.use(requireAuth);
router.post('/', upload.single('file'), handleMulterError, uploadImport);
router.post('/draft', upload.array('files', 10), handleMulterError, createDraft);
router.get('/draft/:id', getDraft);
router.patch('/draft/:id/row', patchDraftRow);
router.post('/draft/:id/approve', approveDraft);
router.get('/', listImports);
router.get('/:id/transactions', listBatchTransactions);
router.post('/:id/recategorize', recategorizeBatch);
router.delete('/:id', deleteBatch);
router.get('/:id/export', exportBatch);
export default router;

const transactionsRouter = Router();
transactionsRouter.use(requireAuth);
transactionsRouter.get('/uncategorized', listUncategorized);
transactionsRouter.patch('/:id/categorize', categorizeTransaction);
export { transactionsRouter };
