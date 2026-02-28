import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import * as txDal from '../dal/transaction.dal.js';

const UNCATEGORIZED = 'לא מסווג';
const VALID_GROUP_BY = ['category', 'month', 'category_month'];

// ── Build $match stage ────────────────────────────────────────────────────────
function buildMatchStage(userId, query) {
  const match = { userId: new mongoose.Types.ObjectId(userId) };

  // Date range
  if (query.from || query.to) {
    match.date = {};
    if (query.from) {
      const d = new Date(query.from);
      if (isNaN(d)) throw new AppError('from: תאריך לא תקין (YYYY-MM-DD)', 400);
      match.date.$gte = d;
    }
    if (query.to) {
      const d = new Date(query.to);
      if (isNaN(d)) throw new AppError('to: תאריך לא תקין (YYYY-MM-DD)', 400);
      d.setHours(23, 59, 59, 999);
      match.date.$lte = d;
    }
  }

  // importBatchId filter
  if (query.importBatchId) {
    if (!mongoose.Types.ObjectId.isValid(query.importBatchId)) {
      throw new AppError('importBatchId לא תקין', 400);
    }
    match.importBatchId = new mongoose.Types.ObjectId(query.importBatchId);
  }

  // sourceType filter — join via importBatch not needed; sourceType isn't on Transaction.
  // We skip it here (it's on ImportBatch). Can be added via $lookup if needed in future.

  // Exclude uncategorized unless explicitly included
  const includeUncategorized = query.includeUncategorized === 'true';
  if (!includeUncategorized) {
    match.category = { $ne: UNCATEGORIZED };
  }

  return match;
}

// ── Format aggregation results ────────────────────────────────────────────────
function formatSummary(raw, groupBy) {
  return raw.map((row) => {
    const base = {
      totalAmount: Math.round(row.totalAmount * 100) / 100,
      txCount: row.txCount,
    };
    if (groupBy === 'category')       return { category: row._id.category, ...base };
    if (groupBy === 'month')          return { month: row._id.month, ...base };
    if (groupBy === 'category_month') return { month: row._id.month, category: row._id.category, ...base };
    return row;
  });
}

// ── Public: summary ───────────────────────────────────────────────────────────
export async function getSummary(userId, query) {
  const groupBy = query.groupBy || 'category';
  if (!VALID_GROUP_BY.includes(groupBy)) {
    throw new AppError(`groupBy חייב להיות אחד מ: ${VALID_GROUP_BY.join(', ')}`, 400);
  }

  const matchStage = buildMatchStage(userId, query);
  const raw = await txDal.aggregateSummary(matchStage, groupBy);
  const data = formatSummary(raw, groupBy);

  return { groupBy, count: data.length, data };
}

// ── Public: top merchants ─────────────────────────────────────────────────────
export async function getTopMerchants(userId, query) {
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));

  // Reuse buildMatchStage but without includeUncategorized logic for merchants
  const matchStage = buildMatchStage(userId, { ...query, includeUncategorized: 'true' });

  const data = await txDal.aggregateTopMerchants(matchStage, limit);
  return { count: data.length, data };
}
