import * as importsService from '../services/imports.service.js';
import { AppError } from '../utils/AppError.js';

export async function uploadImport(req, res, next) {
  try {
    if (!req.file) throw new AppError('קובץ אקסל הוא שדה חובה', 400);
    const { sourceType } = req.body;
    if (!sourceType || !['max', 'visa'].includes(sourceType)) throw new AppError('sourceType חייב להיות max או visa', 400);
    const result = await importsService.processImport({ userId: req.user.id, buffer: req.file.buffer, originalFileName: req.file.originalname, sourceType });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function createDraft(req, res, next) {
  try {
    if (!req.files?.length) throw new AppError('לפחות קובץ אחד נדרש', 400);
    const sourceTypes = Array.isArray(req.body.sourceTypes) ? req.body.sourceTypes : [req.body.sourceTypes || req.body.sourceType || 'max'];
    const files = req.files.map((file, idx) => ({ ...file, sourceType: sourceTypes[idx] || sourceTypes[0] || 'max' }));
    const draft = await importsService.createDraftImport({ userId: req.user.id, files });
    res.status(201).json(draft);
  } catch (e) { next(e); }
}

export async function getDraft(req, res, next) { try { res.json(await importsService.getDraftImport(req.params.id, req.user.id)); } catch (e) { next(e); } }
export async function patchDraftRow(req, res, next) { try { res.json(await importsService.patchDraftRow(req.params.id, req.body.rowId, req.user.id, req.body)); } catch (e) { next(e); } }
export async function approveDraft(req, res, next) { try { res.json(await importsService.approveDraftImport(req.params.id, req.user.id)); } catch (e) { next(e); } }

export async function listImports(req, res, next) { try { res.json(await importsService.listBatches(req.user.id, req.query)); } catch (err) { next(err); } }
export async function listBatchTransactions(req, res, next) { try { res.json(await importsService.listBatchTransactions(req.params.id, req.user.id, req.query)); } catch (err) { next(err); } }
export async function listUncategorized(req, res, next) { try { res.json(await importsService.listUncategorized(req.user.id, req.query)); } catch (err) { next(err); } }
export async function categorizeTransaction(req, res, next) { try { const { categoryId, saveToDictionary, matchType, pattern, priority } = req.body ?? {}; if (!categoryId || typeof categoryId !== 'string') throw new AppError('categoryId הוא שדה חובה', 400); res.json(await importsService.categorizeTransaction(req.params.id, req.user.id, { categoryId, saveToDictionary, matchType, pattern, priority })); } catch (err) { next(err); } }
export async function recategorizeBatch(req, res, next) { try { const force = req.query.force === 'true'; res.json(await importsService.recategorizeBatch(req.params.id, req.user.id, { force })); } catch (err) { next(err); } }
export async function deleteBatch(req, res, next) { try { res.json(await importsService.deleteBatch(req.params.id, req.user.id)); } catch (err) { next(err); } }
export async function exportBatch(req, res, next) { try { const format = (req.query.format || 'csv').toLowerCase(); const { contentType, filename, buffer } = await importsService.exportBatch(req.params.id, req.user.id, format); res.setHeader('Content-Type', contentType); res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); res.send(buffer); } catch (err) { next(err); } }
