import { AppError } from '../utils/AppError.js';
import * as budgetsDal from '../dal/budgets.dal.js';
import { createDefaultBudget, validateMonthKey } from '../utils/budgets.js';

const GROUPS_WITH_DAY = new Set(['fixedBills', 'tithes']);
const GROUP_KEYS = ['fixedBills', 'variableExpenses', 'loansCash', 'tithes', 'savings'];

function validateLine(line, { allowDay = false, path = 'line' } = {}) {
  if (!line || typeof line !== 'object') {
    throw new AppError(`${path} חייב להיות אובייקט`, 400);
  }

  if (!line.name || typeof line.name !== 'string') {
    throw new AppError(`${path}.name חייב להיות מחרוזת`, 400);
  }

  if (typeof line.targetAmount !== 'number' || Number.isNaN(line.targetAmount) || line.targetAmount < 0) {
    throw new AppError(`${path}.targetAmount חייב להיות מספר >= 0`, 400);
  }

  if (line.dayInMonth !== undefined) {
    if (!allowDay) {
      throw new AppError(`${path}.dayInMonth לא נתמך בקבוצה זו`, 400);
    }
    if (!Number.isInteger(line.dayInMonth) || line.dayInMonth < 1 || line.dayInMonth > 31) {
      throw new AppError(`${path}.dayInMonth חייב להיות בין 1 ל-31`, 400);
    }
  }
}

function validateBudgetPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new AppError('body חייב להיות אובייקט', 400);
  }

  const incomeLines = Array.isArray(payload.incomeLines) ? payload.incomeLines : [];
  incomeLines.forEach((line, idx) => validateLine(line, { path: `incomeLines[${idx}]` }));

  const groups = payload.groups || {};
  if (typeof groups !== 'object' || Array.isArray(groups)) {
    throw new AppError('groups חייב להיות אובייקט', 400);
  }

  const normalizedGroups = {};
  for (const key of GROUP_KEYS) {
    const arr = groups[key] ?? [];
    if (!Array.isArray(arr)) {
      throw new AppError(`groups.${key} חייב להיות מערך`, 400);
    }
    arr.forEach((line, idx) => validateLine(line, {
      allowDay: GROUPS_WITH_DAY.has(key),
      path: `groups.${key}[${idx}]`,
    }));
    normalizedGroups[key] = arr;
  }

  if (payload.notes !== undefined && typeof payload.notes !== 'string') {
    throw new AppError('notes חייב להיות מחרוזת', 400);
  }

  return {
    incomeLines,
    groups: normalizedGroups,
    notes: payload.notes ?? '',
  };
}

export async function getBudgetPlan(userId, monthKey) {
  validateMonthKey(monthKey);
  const budgetPlan = await budgetsDal.findBudgetPlan(userId, monthKey);
  if (!budgetPlan) {
    return createDefaultBudget(monthKey);
  }
  return budgetPlan;
}

export async function upsertBudgetPlan(userId, monthKey, payload) {
  validateMonthKey(monthKey);
  const normalizedPayload = validateBudgetPayload(payload);
  return budgetsDal.upsertBudgetPlan(userId, monthKey, normalizedPayload);
}
