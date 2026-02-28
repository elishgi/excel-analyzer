import { AppError } from './AppError.js';

export const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;
export const BUDGET_GROUP_KEYS = ['fixedBills', 'variableExpenses', 'income', 'savings', 'loansCash', 'tithes'];

export function validateMonthKey(monthKey) {
  if (!MONTH_KEY_REGEX.test(monthKey)) {
    throw new AppError('monthKey חייב להיות בפורמט YYYY-MM', 400);
  }

  const month = Number(monthKey.slice(5, 7));
  if (month < 1 || month > 12) {
    throw new AppError('monthKey חייב להיות חודש חוקי בפורמט YYYY-MM', 400);
  }
}

export function createDefaultBudget(monthKey) {
  return {
    monthKey,
    notes: '',
    targets: {
      fixedBills: 0,
      variableExpenses: 0,
      income: 0,
      savings: 0,
      loansCash: 0,
      tithes: 0,
    },
    manualActuals: {},
    manualCells: [],
    groupItems: {
      fixedBillsItems: [],
      variableItems: [],
      loansCashItems: [],
      tithesItems: [],
      savingsItems: [],
      incomeItems: [],
    },
    // backward compatibility
    incomeLines: [],
    groups: {
      fixedBills: [],
      variableExpenses: [],
      loansCash: [],
      tithes: [],
      savings: [],
    },
  };
}

export function getMonthDateRange(monthKey) {
  validateMonthKey(monthKey);
  const [year, month] = monthKey.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, nextMonthStart };
}
