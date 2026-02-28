import xlsx from 'xlsx';
import { normalizeExcel } from '../utils/normalizeExcel.js';
import { AppError } from '../utils/AppError.js';
import * as importBatchDal from '../dal/importBatch.dal.js';
import * as transactionDal from '../dal/transaction.dal.js';
import * as ruleDal from '../dal/dictionaryRule.dal.js';

const UNCATEGORIZED = 'לא מסווג';

// ── Categorization helpers (shared) ──────────────────────────────────────────
function matchRule(businessName, rule) {
  try {
    if (rule.matchType === 'exact')    return businessName === rule.pattern;
    if (rule.matchType === 'contains') return businessName.includes(rule.pattern);
    if (rule.matchType === 'regex')    return new RegExp(rule.pattern).test(businessName);
  } catch { return false; }
  return false;
}

export function categorize(businessName, rules) {
  for (const matchType of ['exact', 'contains', 'regex']) {
    const hits = rules
      .filter((r) => r.matchType === matchType && matchRule(businessName, r))
      .sort((a, b) => b.priority - a.priority);
    if (hits.length) return hits[0];
  }
  return null;
}

// ── Pagination helper ─────────────────────────────────────────────────────────
export function parsePagination(query, defaults = { page: 1, limit: 20 }) {
  const page  = Math.max(1, parseInt(query.page)  || defaults.page);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}

// ── Process import ────────────────────────────────────────────────────────────
export async function processImport({ userId, buffer, originalFileName, sourceType }) {
  const batch = await importBatchDal.createBatch({ userId, sourceType, originalFileName, status: 'processing' });

  try {
    const normalized = normalizeExcel(buffer, sourceType);
    if (!normalized.length) throw new AppError('הקובץ לא מכיל עסקאות תקינות', 400);

    const rules = await ruleDal.getRulesByUser(userId);
    let uncategorizedCount = 0;

    const docs = normalized.map((tx) => {
      const rule = categorize(tx.businessName, rules);
      if (!rule) uncategorizedCount++;
      return {
        userId,
        importBatchId: batch._id,
        date: tx.date,
        businessName: tx.businessName,
        amount: tx.amount,
        cardLast4: tx.cardLast4 ?? null,
        rawDescription: tx.rawDescription ?? null,
        category: rule ? rule.category : UNCATEGORIZED,
        matchedRuleId: rule ? rule._id : null,
      };
    });

    await transactionDal.createManyTransactions(docs);
    await importBatchDal.updateBatchStatus(batch._id, 'done');
    return { importBatchId: batch._id, insertedCount: docs.length, uncategorizedCount };
  } catch (err) {
    await importBatchDal.updateBatchStatus(batch._id, 'failed');
    throw err;
  }
}

// ── List batches ──────────────────────────────────────────────────────────────
export async function listBatches(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [batches, total] = await Promise.all([
    importBatchDal.getBatchesByUser(userId, { skip, limit }),
    importBatchDal.countBatchesByUser(userId),
  ]);
  return { data: batches, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

// ── List transactions for a batch ─────────────────────────────────────────────
export async function listBatchTransactions(batchId, userId, query) {
  const batch = await importBatchDal.getBatchById(batchId, userId);
  if (!batch) throw new AppError('Import batch not found', 404);

  const { page, limit, skip } = parsePagination(query);
  const category = query.category || undefined;

  const [transactions, total] = await Promise.all([
    transactionDal.getTransactionsByBatch(batchId, userId, { skip, limit, category }),
    transactionDal.countTransactionsByBatch(batchId, userId, { category }),
  ]);
  return { data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

// ── List uncategorized ────────────────────────────────────────────────────────
export async function listUncategorized(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const importBatchId = query.importBatchId || undefined;

  const [transactions, total] = await Promise.all([
    transactionDal.getUncategorized(userId, { importBatchId, skip, limit }),
    transactionDal.countUncategorized(userId, { importBatchId }),
  ]);
  return { data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

// ── Categorize single transaction ─────────────────────────────────────────────
export async function categorizeTransaction(transactionId, userId, body) {
  const { category, saveToDictionary = false, matchType, pattern, priority } = body;

  const tx = await transactionDal.getTransactionById(transactionId, userId);
  if (!tx) throw new AppError('Transaction not found', 404);

  await transactionDal.updateTransaction(transactionId, userId, { category, matchedRuleId: null });

  let ruleCreated = false;
  if (saveToDictionary) {
    await ruleDal.createRule({
      userId,
      matchType: matchType || 'exact',
      pattern: pattern || tx.businessName,
      category,
      priority: typeof priority === 'number' ? priority : 100,
    });
    ruleCreated = true;
  }
  return { transactionId, category, ruleCreated };
}

// ── Re-categorize batch ───────────────────────────────────────────────────────
export async function recategorizeBatch(batchId, userId, { force = false } = {}) {
  const batch = await importBatchDal.getBatchById(batchId, userId);
  if (!batch) throw new AppError('Import batch not found', 404);

  const rules = await ruleDal.getRulesByUser(userId);

  // If force=true → recategorize ALL; else → only uncategorized
  const transactions = await transactionDal.getAllTransactionsByBatch(
    batchId,
    userId,
    { onlyCategory: force ? undefined : UNCATEGORIZED }
  );

  if (!transactions.length) {
    return { importBatchId: batchId, updatedCount: 0, uncategorizedCount: 0 };
  }

  const updates = [];
  let uncategorizedCount = 0;

  for (const tx of transactions) {
    const rule = categorize(tx.businessName, rules);
    const newCategory = rule ? rule.category : UNCATEGORIZED;
    if (!rule) uncategorizedCount++;

    // Only push update if something changed
    if (tx.category !== newCategory || String(tx.matchedRuleId) !== String(rule?._id ?? null)) {
      updates.push({
        id: tx._id,
        category: newCategory,
        matchedRuleId: rule ? rule._id : null,
      });
    }
  }

  if (updates.length) {
    await transactionDal.bulkUpdateCategories(updates);
  }

  return { importBatchId: batchId, updatedCount: updates.length, uncategorizedCount };
}

// ── Delete batch + transactions ───────────────────────────────────────────────
export async function deleteBatch(batchId, userId) {
  const batch = await importBatchDal.getBatchById(batchId, userId);
  if (!batch) throw new AppError('Import batch not found', 404);

  const [, deleteResult] = await Promise.all([
    importBatchDal.deleteBatch(batchId, userId),
    transactionDal.deleteTransactionsByBatch(batchId, userId),
  ]);

  return {
    message: 'deleted',
    importBatchId: batchId,
    deletedTransactions: deleteResult.deletedCount,
  };
}

// ── Export batch ──────────────────────────────────────────────────────────────
const CSV_HEADERS = ['date', 'businessName', 'amount', 'category', 'cardLast4', 'rawDescription'];

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportBatch(batchId, userId, format = 'csv') {
  const batch = await importBatchDal.getBatchById(batchId, userId);
  if (!batch) throw new AppError('Import batch not found', 404);

  if (!['csv', 'xlsx'].includes(format)) {
    throw new AppError('format חייב להיות csv או xlsx', 400);
  }

  const transactions = await transactionDal.getAllTransactionsByBatch(batchId, userId);

  const rows = transactions.map((tx) => ({
    date:           tx.date ? tx.date.toISOString().slice(0, 10) : '',
    businessName:   tx.businessName ?? '',
    amount:         tx.amount ?? '',
    category:       tx.category ?? '',
    cardLast4:      tx.cardLast4 ?? '',
    rawDescription: tx.rawDescription ?? '',
  }));

  if (format === 'csv') {
    const lines = [
      CSV_HEADERS.join(','),
      ...rows.map((r) => CSV_HEADERS.map((h) => escapeCsv(r[h])).join(',')),
    ];
    // BOM for Excel UTF-8 compatibility
    const csv = '\uFEFF' + lines.join('\r\n');
    return { contentType: 'text/csv; charset=utf-8', filename: `batch-${batchId}.csv`, buffer: Buffer.from(csv, 'utf8') };
  }

  // xlsx
  const wsData = [CSV_HEADERS, ...rows.map((r) => CSV_HEADERS.map((h) => r[h]))];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Transactions');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `batch-${batchId}.xlsx`,
    buffer,
  };
}
