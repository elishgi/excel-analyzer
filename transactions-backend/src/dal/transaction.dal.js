import mongoose from 'mongoose';
import Transaction from '../models/transaction.model.js';

// ── Existing ──────────────────────────────────────────────────────────────────
export const createManyTransactions = (docs) => Transaction.insertMany(docs);

export const getTransactionsByBatch = (importBatchId, userId, { skip = 0, limit = 20, category } = {}) => {
  const filter = { importBatchId, userId };
  if (category) filter.category = category;
  return Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit);
};

export const countTransactionsByBatch = (importBatchId, userId, { category } = {}) => {
  const filter = { importBatchId, userId };
  if (category) filter.category = category;
  return Transaction.countDocuments(filter);
};

export const getUncategorized = (userId, { importBatchId, skip = 0, limit = 20 } = {}) => {
  const filter = { userId, category: 'לא מסווג' };
  if (importBatchId) filter.importBatchId = importBatchId;
  return Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit);
};

export const countUncategorized = (userId, { importBatchId } = {}) => {
  const filter = { userId, category: 'לא מסווג' };
  if (importBatchId) filter.importBatchId = importBatchId;
  return Transaction.countDocuments(filter);
};

export const getTransactionById = (id, userId) =>
  Transaction.findOne({ _id: id, userId });

export const updateTransaction = (id, userId, data) =>
  Transaction.findOneAndUpdate({ _id: id, userId }, data, { new: true, runValidators: true });

// ── New ───────────────────────────────────────────────────────────────────────

/** Delete all transactions for a batch (used when deleting an ImportBatch) */
export const deleteTransactionsByBatch = (importBatchId, userId) =>
  Transaction.deleteMany({ importBatchId, userId });

/**
 * Fetch all transactions for a batch (no pagination — for recategorize / export).
 * @param {'לא מסווג'|undefined} onlyCategory - if set, filter by this category
 */
export const getAllTransactionsByBatch = (importBatchId, userId, { onlyCategory } = {}) => {
  const filter = { importBatchId, userId };
  if (onlyCategory) filter.category = onlyCategory;
  return Transaction.find(filter).sort({ date: -1 });
};

/**
 * Bulk-update a single transaction's category + matchedRuleId.
 * Used during recategorize — faster than findOneAndUpdate per doc.
 */
export const bulkUpdateCategories = (updates) => {
  // updates: [{ id, category, matchedRuleId }]
  const ops = updates.map(({ id, category, matchedRuleId }) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: { $set: { category, matchedRuleId: matchedRuleId ?? null } },
    },
  }));
  if (!ops.length) return Promise.resolve({ modifiedCount: 0 });
  return Transaction.bulkWrite(ops);
};

/**
 * Aggregation for reports.
 * @param {object} matchStage - $match conditions (userId already as ObjectId)
 * @param {'category'|'month'|'category_month'} groupBy
 */
export const aggregateSummary = (matchStage, groupBy) => {
  let groupId;
  if (groupBy === 'month') {
    groupId = { month: { $dateToString: { format: '%Y-%m', date: '$date' } } };
  } else if (groupBy === 'category_month') {
    groupId = {
      month:    { $dateToString: { format: '%Y-%m', date: '$date' } },
      category: '$category',
    };
  } else {
    // default: category
    groupId = { category: '$category' };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id:         groupId,
        totalAmount: { $sum: '$amount' },
        txCount:     { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ];

  return Transaction.aggregate(pipeline);
};

/**
 * Aggregation for top merchants.
 */
export const aggregateTopMerchants = (matchStage, limit = 10) => {
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id:         '$businessName',
        totalAmount: { $sum: '$amount' },
        txCount:     { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
    { $limit: limit },
    {
      $project: {
        _id:          0,
        businessName: '$_id',
        totalAmount:  1,
        txCount:      1,
      },
    },
  ];

  return Transaction.aggregate(pipeline);
};
