import xlsx from 'xlsx';
import { normalizeExcel } from '../utils/normalizeExcel.js';
import { AppError } from '../utils/AppError.js';
import * as importBatchDal from '../dal/importBatch.dal.js';
import * as transactionDal from '../dal/transaction.dal.js';
import * as ruleDal from '../dal/dictionaryRule.dal.js';
import * as draftDal from '../dal/draftImport.dal.js';
import * as categoryDal from '../dal/category.dal.js';
import { MAX_REGEX_PATTERN_LENGTH } from '../utils/validate.js';

const UNCATEGORIZED = 'לא מסווג';

function isSuspiciousRegexPattern(pattern) {
  return /(\([^)]*[+*][^)]*\)[+*{])|(\+\+)|(\*\*)|(\{\d+,\}\{\d+,\})/.test(pattern);
}

function prepareRulesForMatching(rules) {
  return rules.map((rule) => {
    if (rule.matchType !== 'regex') return rule;
    const pattern = String(rule.pattern ?? '').trim();
    if (pattern.length > MAX_REGEX_PATTERN_LENGTH) throw new AppError('Regex pattern too long', 400);
    if (isSuspiciousRegexPattern(pattern)) throw new AppError('Regex pattern suspicious', 400);
    try { rule._compiledRegex = new RegExp(pattern); } catch { throw new AppError('Invalid regex pattern', 400); }
    return rule;
  });
}

function matchRule(row, rule) {
  const merchant = row.businessName;
  const patternMatched = rule.matchType === 'exact'
    ? merchant === rule.pattern
    : rule.matchType === 'contains'
      ? merchant.includes(rule.pattern)
      : Boolean(rule._compiledRegex?.test(merchant));
  if (!patternMatched) return false;
  const cond = rule.conditions || {};
  if (cond.sourceType && cond.sourceType !== row.sourceType) return false;
  if (cond.last4 && cond.last4 !== row.cardLast4) return false;
  if (cond.dateFrom && row.date < new Date(cond.dateFrom)) return false;
  if (cond.dateTo && row.date > new Date(cond.dateTo)) return false;
  return true;
}

export function categorize(row, rules) {
  for (const matchType of ['exact', 'contains', 'regex']) {
    const hits = rules.filter((r) => r.matchType === matchType && matchRule(row, r)).sort((a, b) => b.priority - a.priority);
    if (hits.length) return hits[0];
  }
  return null;
}

export function parsePagination(query, defaults = { page: 1, limit: 20 }) {
  const page = Math.max(1, parseInt(query.page) || defaults.page);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}

export async function processImport({ userId, buffer, originalFileName, sourceType }) {
  const draft = await createDraftImport({ userId, files: [{ buffer, originalname: originalFileName, sourceType }] });
  return approveDraftImport(draft._id, userId);
}

export async function createDraftImport({ userId, files }) {
  const rules = prepareRulesForMatching(await ruleDal.getRulesByUser(userId));
  const categories = await categoryDal.listByUser(userId);
  const categoryMap = new Map(categories.map((c) => [String(c._id), c]));

  const rows = [];
  for (const file of files) {
    const normalized = normalizeExcel(file.buffer, file.sourceType);
    for (const tx of normalized) {
      const row = { ...tx, sourceType: file.sourceType };
      const rule = categorize(row, rules);
      const categoryId = rule?.categoryId ? String(rule.categoryId._id || rule.categoryId) : null;
      rows.push({
        date: tx.date,
        merchantName: tx.businessName,
        amount: tx.amount,
        last4: tx.cardLast4 ?? null,
        sourceType: file.sourceType,
        suggestedCategoryId: categoryId,
        categoryId,
        boxKey: categoryId ? categoryMap.get(categoryId)?.boxKey ?? null : null,
        flags: categoryId ? [] : ['uncategorized'],
        ignored: false,
      });
    }
  }
  if (!rows.length) throw new AppError('הקובץ לא מכיל עסקאות תקינות', 400);

  return draftDal.createDraft({ userId, fileNames: files.map((f) => f.originalname), rows, status: 'draft' });
}

export async function getDraftImport(draftId, userId) {
  const draft = await draftDal.getDraftLean(draftId, userId);
  if (!draft) throw new AppError('Draft not found', 404);
  return draft;
}

export async function patchDraftRow(draftId, rowId, userId, changes) {
  const draft = await draftDal.getDraft(draftId, userId);
  if (!draft) throw new AppError('Draft not found', 404);
  const row = draft.rows.id(rowId);
  if (!row) throw new AppError('Draft row not found', 404);
  if (changes.amount !== undefined) row.amount = Number(changes.amount);
  if (changes.categoryId !== undefined) row.categoryId = changes.categoryId || null;
  if (changes.ignored !== undefined) row.ignored = Boolean(changes.ignored);

  if (changes.categoryId) {
    const category = await categoryDal.getById(changes.categoryId, userId);
    row.boxKey = category?.boxKey ?? null;

    if (changes.applyAlways) {
      await ruleDal.createRule({
        userId,
        matchType: 'exact',
        pattern: row.merchantName,
        categoryId: category._id,
        priority: 999,
        conditions: {
          sourceType: row.sourceType,
          last4: row.last4 || null,
        },
      });
    }
  }

  await draftDal.saveDraft(draft);
  return draft;
}

export async function approveDraftImport(draftId, userId) {
  const draft = await draftDal.getDraft(draftId, userId);
  if (!draft) throw new AppError('Draft not found', 404);
  if (draft.status !== 'draft') throw new AppError('Draft already finalized', 400);

  const rows = draft.rows.filter((r) => !r.ignored);
  if (rows.some((r) => !r.categoryId)) throw new AppError('All rows must be categorized before approve', 400);

  const categoryIds = [...new Set(rows.map((r) => String(r.categoryId)))];
  const categories = await categoryDal.listByUser(userId);
  const categoryMap = new Map(categories.map((c) => [String(c._id), c]));
  for (const id of categoryIds) {
    if (!categoryMap.get(id)?.boxKey) throw new AppError('Category missing boxKey', 400);
  }

  const batch = await importBatchDal.createBatch({
    userId,
    sourceType: rows[0]?.sourceType || 'max',
    originalFileName: (draft.fileNames || []).join(', '),
    status: 'processing',
  });

  const docs = rows.map((r) => ({
    userId,
    importBatchId: batch._id,
    date: r.date,
    businessName: r.merchantName,
    amount: r.amount,
    cardLast4: r.last4,
    categoryId: r.categoryId,
    category: categoryMap.get(String(r.categoryId))?.name || UNCATEGORIZED,
  }));

  await transactionDal.createManyTransactions(docs);
  await importBatchDal.updateBatchStatus(batch._id, 'done');
  draft.status = 'approved';
  await draftDal.saveDraft(draft);

  return { importBatchId: batch._id, insertedCount: docs.length, uncategorizedCount: 0, draftId: draft._id };
}

export async function listBatches(userId, query) { const { page, limit, skip } = parsePagination(query); const [batches, total] = await Promise.all([importBatchDal.getBatchesByUser(userId, { skip, limit }), importBatchDal.countBatchesByUser(userId)]); return { data: batches, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }; }
export async function listBatchTransactions(batchId, userId, query) { const batch = await importBatchDal.getBatchById(batchId, userId); if (!batch) throw new AppError('Import batch not found', 404); const { page, limit, skip } = parsePagination(query); const category = query.category || undefined; const [transactions, total] = await Promise.all([transactionDal.getTransactionsByBatch(batchId, userId, { skip, limit, category }), transactionDal.countTransactionsByBatch(batchId, userId, { category })]); return { data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }; }
export async function listUncategorized(userId, query) { const { page, limit, skip } = parsePagination(query); const importBatchId = query.importBatchId || undefined; const [transactions, total] = await Promise.all([transactionDal.getUncategorized(userId, { importBatchId, skip, limit }), transactionDal.countUncategorized(userId, { importBatchId })]); return { data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }; }
export async function categorizeTransaction(transactionId, userId, body) { const { categoryId, saveToDictionary = false, matchType, pattern, priority } = body; const tx = await transactionDal.getTransactionById(transactionId, userId); if (!tx) throw new AppError('Transaction not found', 404); await transactionDal.updateTransaction(transactionId, userId, { categoryId, matchedRuleId: null }); let ruleCreated = false; if (saveToDictionary) { await ruleDal.createRule({ userId, matchType: matchType || 'exact', pattern: pattern || tx.businessName, categoryId, priority: typeof priority === 'number' ? priority : 100 }); ruleCreated = true; } return { transactionId, categoryId, ruleCreated }; }
export async function recategorizeBatch(batchId, userId, { force = false } = {}) { return { updatedCount: 0, uncategorizedCount: 0, force, batchId }; }
export async function deleteBatch(batchId, userId) { const batch = await importBatchDal.getBatchById(batchId, userId); if (!batch) throw new AppError('Import batch not found', 404); const [, deleteResult] = await Promise.all([importBatchDal.deleteBatch(batchId, userId), transactionDal.deleteTransactionsByBatch(batchId, userId)]); return { message: 'deleted', importBatchId: batchId, deletedTransactions: deleteResult.deletedCount }; }

const CSV_HEADERS = ['date', 'businessName', 'amount', 'category', 'cardLast4', 'rawDescription'];
function escapeCsv(val) { if (val == null) return ''; const s = String(val); if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`; return s; }
export async function exportBatch(batchId, userId, format = 'csv') { const batch = await importBatchDal.getBatchById(batchId, userId); if (!batch) throw new AppError('Import batch not found', 404); const transactions = await transactionDal.getAllTransactionsByBatch(batchId, userId); const rows = transactions.map((tx) => ({ date: tx.date ? tx.date.toISOString().slice(0, 10) : '', businessName: tx.businessName ?? '', amount: tx.amount ?? '', category: tx.category ?? '', cardLast4: tx.cardLast4 ?? '', rawDescription: tx.rawDescription ?? '' })); if (format === 'csv') { const lines = [CSV_HEADERS.join(','), ...rows.map((r) => CSV_HEADERS.map((h) => escapeCsv(r[h])).join(','))]; const csv = '\uFEFF' + lines.join('\r\n'); return { contentType: 'text/csv; charset=utf-8', filename: `batch-${batchId}.csv`, buffer: Buffer.from(csv, 'utf8') }; } const wsData = [CSV_HEADERS, ...rows.map((r) => CSV_HEADERS.map((h) => r[h]))]; const ws = xlsx.utils.aoa_to_sheet(wsData); const wb = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(wb, ws, 'Transactions'); const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }); return { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `batch-${batchId}.xlsx`, buffer }; }
