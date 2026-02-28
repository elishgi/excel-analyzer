import BudgetPlan from '../models/BudgetPlan.js';

export const findBudgetPlan = (userId, monthKey) =>
  BudgetPlan.findOne({ userId, monthKey }).lean();

export const upsertBudgetPlan = (userId, monthKey, payload) =>
  BudgetPlan.findOneAndUpdate(
    { userId, monthKey },
    {
      $set: {
        incomeLines: payload.incomeLines,
        groups: payload.groups,
        notes: payload.notes ?? '',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();
