import Transaction from '../models/transaction.model.js';

export const getTransactionsByMonth = (userId, start, nextMonthStart) =>
  Transaction.find({
    userId,
    date: { $gte: start, $lt: nextMonthStart },
  })
    .select('businessName amount category date')
    .lean();
