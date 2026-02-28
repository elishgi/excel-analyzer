import {
  CATEGORY_GROUP_MAP,
  DASHBOARD_GROUPS,
  GROUP_LABELS,
} from '../config/dashboardCategoryMap.js';
import { createDefaultBudget } from './budgets.js';

const OVERVIEW_ORDER = ['income', 'savings', 'fixedBills', 'variableExpenses', 'loansCash', 'tithes'];

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

function classifyGroupByCategory(category) {
  const normalizedCategory = normalizeText(category);

  for (const [groupKey, aliases] of Object.entries(CATEGORY_GROUP_MAP)) {
    const found = aliases.some((alias) => normalizedCategory.includes(normalizeText(alias)));
    if (found) return groupKey;
  }

  return 'variableExpenses';
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildLinesBreakdown(lines, transactions) {
  const rows = lines.map((line) => ({
    name: line.name,
    dayInMonth: line.dayInMonth,
    target: round2(line.targetAmount),
    actual: 0,
    diff: 0,
  }));

  let unassigned = 0;

  for (const tx of transactions) {
    const businessName = normalizeText(tx.businessName);
    const amount = Math.abs(Number(tx.amount) || 0);
    const row = rows.find((item) => businessName.includes(normalizeText(item.name)));

    if (row) row.actual = round2(row.actual + amount);
    else unassigned = round2(unassigned + amount);
  }

  for (const row of rows) row.diff = round2(row.actual - row.target);

  return { rows, unassigned };
}

function sumTargets(lines = []) {
  return round2(lines.reduce((sum, line) => sum + (Number(line.targetAmount) || 0), 0));
}

function sumActualByTransactions(transactions = []) {
  return round2(transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0));
}

export function buildMonthlyDashboardData(budgetPlanRaw, monthTransactions, monthKey) {
  const budgetPlan = budgetPlanRaw || createDefaultBudget(monthKey);
  const groupedActualTx = { income: [], fixedBills: [], variableExpenses: [], loansCash: [], tithes: [], savings: [] };

  for (const tx of monthTransactions) {
    const group = classifyGroupByCategory(tx.category);
    groupedActualTx[group].push(tx);
  }

  const groupsBreakdown = {};
  const unassignedByGroup = {};

  const incomeBreakdown = buildLinesBreakdown(budgetPlan.incomeLines || [], groupedActualTx.income);
  groupsBreakdown.incomeLines = incomeBreakdown.rows;
  unassignedByGroup.income = incomeBreakdown.unassigned;

  for (const groupKey of DASHBOARD_GROUPS) {
    const breakdown = buildLinesBreakdown(budgetPlan.groups?.[groupKey] || [], groupedActualTx[groupKey] || []);
    groupsBreakdown[groupKey] = breakdown.rows;
    unassignedByGroup[groupKey] = breakdown.unassigned;
  }

  const overviewTable = OVERVIEW_ORDER.map((key) => {
    const target = key === 'income' ? sumTargets(budgetPlan.incomeLines) : sumTargets(budgetPlan.groups?.[key]);
    const actual = key === 'income' ? sumActualByTransactions(groupedActualTx.income) : sumActualByTransactions(groupedActualTx[key]);
    return { key, label: GROUP_LABELS[key], target, actual, diff: round2(actual - target) };
  });

  const plannedExpenseTotal = round2(
    sumTargets(budgetPlan.groups?.fixedBills)
    + sumTargets(budgetPlan.groups?.variableExpenses)
    + sumTargets(budgetPlan.groups?.loansCash)
    + sumTargets(budgetPlan.groups?.tithes)
    + sumTargets(budgetPlan.groups?.savings)
  );

  const actualExpenseTotal = round2(
    sumActualByTransactions(groupedActualTx.fixedBills)
    + sumActualByTransactions(groupedActualTx.variableExpenses)
    + sumActualByTransactions(groupedActualTx.loansCash)
    + sumActualByTransactions(groupedActualTx.tithes)
    + sumActualByTransactions(groupedActualTx.savings)
  );

  const dailyMap = new Map();
  for (const tx of monthTransactions) {
    const dateKey = tx.date.toISOString().slice(0, 10);
    dailyMap.set(dateKey, round2((dailyMap.get(dateKey) || 0) + Math.abs(Number(tx.amount) || 0)));
  }

  return {
    monthKey,
    kpis: {
      plannedExpenseTotal,
      actualExpenseTotal,
      remainingToSpend: round2(plannedExpenseTotal - actualExpenseTotal),
      isWithinBudget: actualExpenseTotal <= plannedExpenseTotal,
    },
    overviewTable,
    groupsBreakdown: { ...groupsBreakdown, unassignedByGroup },
    charts: {
      expenseSplitByGroup: DASHBOARD_GROUPS.map((key) => ({ key, label: GROUP_LABELS[key], value: sumActualByTransactions(groupedActualTx[key]) })),
      spendByDay: Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total })),
    },
  };
}
