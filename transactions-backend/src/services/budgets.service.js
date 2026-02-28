import { AppError } from '../utils/AppError.js';
import * as budgetsDal from '../dal/budgets.dal.js';
import { BUDGET_GROUP_KEYS, createDefaultBudget, validateMonthKey } from '../utils/budgets.js';

const ITEM_KEYS_BY_GROUP = {
  fixedBills: 'fixedBillsItems',
  variableExpenses: 'variableItems',
  income: 'incomeItems',
  savings: 'savingsItems',
  loansCash: 'loansCashItems',
  tithes: 'tithesItems',
};

const GROUPS_WITH_DAY = new Set(['fixedBills', 'tithes']);

function toNonNegativeNumber(value, path) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new AppError(`${path} חייב להיות מספר >= 0`, 400);
  }
  return value;
}

function validateLine(line, { allowDay = false, path = 'line' } = {}) {
  if (!line || typeof line !== 'object') throw new AppError(`${path} חייב להיות אובייקט`, 400);
  if (!line.name || typeof line.name !== 'string') throw new AppError(`${path}.name חייב להיות מחרוזת`, 400);

  const normalized = {
    name: line.name.trim(),
    targetAmount: toNonNegativeNumber(Number(line.targetAmount), `${path}.targetAmount`),
  };

  if (line.dayInMonth !== undefined && line.dayInMonth !== null && line.dayInMonth !== '') {
    if (!allowDay) throw new AppError(`${path}.dayInMonth לא נתמך בקבוצה זו`, 400);
    const day = Number(line.dayInMonth);
    if (!Number.isInteger(day) || day < 1 || day > 31) throw new AppError(`${path}.dayInMonth חייב להיות בין 1 ל-31`, 400);
    normalized.dayInMonth = day;
  }

  if (line.manualActual !== undefined && line.manualActual !== null && line.manualActual !== '') {
    normalized.manualActual = toNonNegativeNumber(Number(line.manualActual), `${path}.manualActual`);
  } else if (line.manualActual === null) {
    normalized.manualActual = null;
  }

  return normalized;
}

function normalizeManualCells(payloadCells = []) {
  if (!Array.isArray(payloadCells)) throw new AppError('manualCells חייב להיות מערך', 400);
  return payloadCells.map((cell, idx) => {
    if (!cell || typeof cell !== 'object') throw new AppError(`manualCells[${idx}] חייב להיות אובייקט`, 400);
    if (!cell.path || typeof cell.path !== 'string') throw new AppError(`manualCells[${idx}].path חייב להיות מחרוזת`, 400);
    return {
      path: cell.path,
      value: cell.value ?? null,
      updatedAt: cell.updatedAt ? new Date(cell.updatedAt) : new Date(),
    };
  });
}

function validateBudgetPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new AppError('body חייב להיות אובייקט', 400);

  const defaults = createDefaultBudget('2000-01');
  const targets = {};
  for (const key of BUDGET_GROUP_KEYS) {
    const val = payload.targets?.[key] ?? defaults.targets[key] ?? 0;
    targets[key] = toNonNegativeNumber(Number(val), `targets.${key}`);
  }

  const manualActuals = {};
  for (const key of BUDGET_GROUP_KEYS) {
    const val = payload.manualActuals?.[key];
    if (val === null || val === undefined || val === '') continue;
    manualActuals[key] = toNonNegativeNumber(Number(val), `manualActuals.${key}`);
  }

  const groupItems = {};
  for (const key of BUDGET_GROUP_KEYS) {
    const itemKey = ITEM_KEYS_BY_GROUP[key];
    const arr = payload.groupItems?.[itemKey]
      ?? (key === 'income' ? payload.incomeLines : payload.groups?.[key])
      ?? [];

    if (!Array.isArray(arr)) throw new AppError(`groupItems.${itemKey} חייב להיות מערך`, 400);
    groupItems[itemKey] = arr
      .filter((line) => line?.name?.trim())
      .map((line, idx) => validateLine(line, { allowDay: GROUPS_WITH_DAY.has(key), path: `groupItems.${itemKey}[${idx}]` }));
  }

  if (payload.notes !== undefined && typeof payload.notes !== 'string') throw new AppError('notes חייב להיות מחרוזת', 400);

  const manualCells = normalizeManualCells(payload.manualCells || []);

  return {
    notes: payload.notes ?? '',
    targets,
    manualActuals,
    manualCells,
    groupItems,
    // backward compatibility mirrors
    incomeLines: groupItems.incomeItems,
    groups: {
      fixedBills: groupItems.fixedBillsItems,
      variableExpenses: groupItems.variableItems,
      loansCash: groupItems.loansCashItems,
      tithes: groupItems.tithesItems,
      savings: groupItems.savingsItems,
    },
  };
}

export async function getBudgetPlan(userId, monthKey) {
  validateMonthKey(monthKey);
  const budgetPlan = await budgetsDal.findBudgetPlan(userId, monthKey);
  return budgetPlan || createDefaultBudget(monthKey);
}

export async function upsertBudgetPlan(userId, monthKey, payload) {
  validateMonthKey(monthKey);
  const normalizedPayload = validateBudgetPayload(payload);
  return budgetsDal.upsertBudgetPlan(userId, monthKey, normalizedPayload);
}

export async function patchBudgetCell(userId, monthKey, { path, value }) {
  validateMonthKey(monthKey);
  if (!path || typeof path !== 'string') throw new AppError('path חייב להיות מחרוזת', 400);

  const budget = (await budgetsDal.findBudgetPlan(userId, monthKey)) || createDefaultBudget(monthKey);
  const current = Array.isArray(budget.manualCells) ? [...budget.manualCells] : [];
  const idx = current.findIndex((cell) => cell.path === path);

  if (value === null) {
    if (idx >= 0) current.splice(idx, 1);
  } else if (idx >= 0) {
    current[idx] = { ...current[idx], value, updatedAt: new Date() };
  } else {
    current.push({ path, value, updatedAt: new Date() });
  }

  return budgetsDal.updateBudgetManualCells(userId, monthKey, current);
}
