import * as importsService from '../services/imports.service.js';
import { AppError } from '../utils/AppError.js';

// POST /api/imports
export async function uploadImport(req, res, next) {
  try {
    if (!req.file) throw new AppError('קובץ אקסל הוא שדה חובה', 400);
    const { sourceType } = req.body;
    if (!sourceType || !['max', 'visa'].includes(sourceType)) {
      throw new AppError('sourceType חייב להיות max או visa', 400);
    }
    const result = await importsService.processImport({
      userId: req.user.id,
      buffer: req.file.buffer,
      originalFileName: req.file.originalname,
      sourceType,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

// GET /api/imports
export async function listImports(req, res, next) {
  try {
    res.json(await importsService.listBatches(req.user.id, req.query));
  } catch (err) { next(err); }
}

// GET /api/imports/:id/transactions
export async function listBatchTransactions(req, res, next) {
  try {
    res.json(await importsService.listBatchTransactions(req.params.id, req.user.id, req.query));
  } catch (err) { next(err); }
}

// GET /api/transactions/uncategorized
export async function listUncategorized(req, res, next) {
  try {
    res.json(await importsService.listUncategorized(req.user.id, req.query));
  } catch (err) { next(err); }
}

// PATCH /api/transactions/:id/categorize
export async function categorizeTransaction(req, res, next) {
  try {
    const { category, saveToDictionary, matchType, pattern, priority } = req.body ?? {};
    if (!category || typeof category !== 'string' || !category.trim()) {
      throw new AppError('category הוא שדה חובה', 400);
    }
    res.json(await importsService.categorizeTransaction(
      req.params.id, req.user.id,
      { category: category.trim(), saveToDictionary, matchType, pattern, priority }
    ));
  } catch (err) { next(err); }
}

// POST /api/imports/:id/recategorize
export async function recategorizeBatch(req, res, next) {
  try {
    const force = req.query.force === 'true';
    res.json(await importsService.recategorizeBatch(req.params.id, req.user.id, { force }));
  } catch (err) { next(err); }
}

// DELETE /api/imports/:id
export async function deleteBatch(req, res, next) {
  try {
    res.json(await importsService.deleteBatch(req.params.id, req.user.id));
  } catch (err) { next(err); }
}

// GET /api/imports/:id/export
export async function exportBatch(req, res, next) {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const { contentType, filename, buffer } = await importsService.exportBatch(
      req.params.id, req.user.id, format
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
}
