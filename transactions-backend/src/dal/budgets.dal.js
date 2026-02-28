import BudgetPlan from '../models/BudgetPlan.js';

export const findBudgetPlan = (userId, monthKey) =>
  BudgetPlan.findOne({ userId, monthKey }).lean();

export const upsertBudgetPlan = (userId, monthKey, payload) =>
  BudgetPlan.findOneAndUpdate(
    { userId, monthKey },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();

export const updateBudgetManualCells = (userId, monthKey, manualCells) =>
  BudgetPlan.findOneAndUpdate(
    { userId, monthKey },
    { $set: { manualCells } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();
