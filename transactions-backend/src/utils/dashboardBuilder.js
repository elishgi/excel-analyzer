import { CATEGORY_GROUP_MAP, DASHBOARD_GROUPS, GROUP_LABELS } from '../config/dashboardCategoryMap.js';
import { createDefaultBudget } from './budgets.js';

const AUTO_GROUPS = new Set(['fixedBills', 'variableExpenses', 'tithes']);
const EXPENSE_GROUPS = ['fixedBills', 'variableExpenses', 'savings', 'loansCash', 'tithes'];
const ITEM_KEY_BY_GROUP = {
  fixedBills: 'fixedBillsItems',
  variableExpenses: 'variableItems',
  income: 'incomeItems',
  savings: 'savingsItems',
  loansCash: 'loansCashItems',
  tithes: 'tithesItems',
};

function normalizeText(value = '') { return String(value).trim().toLowerCase(); }
function round2(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function asNum(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function classifyGroupByCategory(category) {
  const normalizedCategory = normalizeText(category);
  for (const [groupKey, aliases] of Object.entries(CATEGORY_GROUP_MAP)) {
    if (aliases.some((alias) => normalizedCategory.includes(normalizeText(alias)))) return groupKey;
  }
  return 'variableExpenses';
}

function sumTransactions(transactions = []) {
  return round2(transactions.reduce((sum, tx) => sum + Math.abs(asNum(tx.amount)), 0));
}

function getManualCellsMap(manualCells = []) {
  const map = new Map();
  for (const cell of manualCells) {
    if (cell?.path) map.set(cell.path, cell.value);
  }
  return map;
}

function normalizeItems(budgetPlan, groupKey) {
  const itemKey = ITEM_KEY_BY_GROUP[groupKey];
  const groupItems = budgetPlan.groupItems?.[itemKey];
  if (Array.isArray(groupItems) && groupItems.length) return groupItems;

  if (groupKey === 'income') return budgetPlan.incomeLines || [];
  return budgetPlan.groups?.[groupKey] || [];
}

export function buildMonthlyDashboardData(budgetPlanRaw, monthTransactions, monthKey) {
  const budgetPlan = budgetPlanRaw || createDefaultBudget(monthKey);
  const manualCellsMap = getManualCellsMap(budgetPlan.manualCells || []);

  const groupedActualTx = Object.fromEntries(DASHBOARD_GROUPS.map((key) => [key, []]));
  for (const tx of monthTransactions) groupedActualTx[classifyGroupByCategory(tx.category)].push(tx);

  const groupsBreakdown = {};
  const overviewTable = [];
  const editable = { cells: [] };

  for (const key of DASHBOARD_GROUPS) {
    const groupLabel = GROUP_LABELS[key];
    const items = normalizeItems(budgetPlan, key);
    const txs = groupedActualTx[key] || [];
    const groupAutoTotal = AUTO_GROUPS.has(key) ? sumTransactions(txs) : 0;

    const rows = items.map((item, idx) => {
      const targetPath = `groups.${key}.items[${idx}].target`;
      const actualPath = `groups.${key}.items[${idx}].actual`;
      editable.cells.push(targetPath, actualPath);

      const matchedTx = AUTO_GROUPS.has(key)
        ? txs.filter((tx) => normalizeText(tx.businessName).includes(normalizeText(item.name)))
        : [];

      const autoActual = AUTO_GROUPS.has(key) ? sumTransactions(matchedTx) : 0;
      const target = round2(asNum(manualCellsMap.get(targetPath), asNum(item.targetAmount)));
      const manualActual = manualCellsMap.has(actualPath)
        ? asNum(manualCellsMap.get(actualPath))
        : (item.manualActual ?? null);
      const finalActual = manualActual === null || manualActual === undefined
        ? (AUTO_GROUPS.has(key) ? autoActual : 0)
        : round2(asNum(manualActual));

      return {
        name: item.name,
        dayInMonth: item.dayInMonth,
        target,
        autoActual,
        manualActual,
        finalActual,
        diff: round2(finalActual - target),
      };
    });

    const itemsFinalTotal = round2(rows.reduce((sum, row) => sum + asNum(row.finalActual), 0));
    const itemsAutoTotal = round2(rows.reduce((sum, row) => sum + asNum(row.autoActual), 0));
    const unassignedAuto = AUTO_GROUPS.has(key) ? round2(Math.max(0, groupAutoTotal - itemsAutoTotal)) : 0;

    const targetPath = `overview.${key}.target`;
    const actualPath = `overview.${key}.actual`;
    editable.cells.push(targetPath, actualPath);

    const targetBase = asNum(budgetPlan.targets?.[key], round2(rows.reduce((sum, row) => sum + row.target, 0)));
    const targetManual = manualCellsMap.get(targetPath);
    const finalTarget = round2(asNum(targetManual, targetBase));

    const groupManualActual = manualCellsMap.has(actualPath)
      ? asNum(manualCellsMap.get(actualPath))
      : budgetPlan.manualActuals?.[key];

    const defaultFinalActual = AUTO_GROUPS.has(key)
      ? round2(itemsFinalTotal + unassignedAuto)
      : itemsFinalTotal;

    const finalActual = groupManualActual === null || groupManualActual === undefined
      ? defaultFinalActual
      : round2(asNum(groupManualActual));

    const source = groupManualActual === null || groupManualActual === undefined
      ? (AUTO_GROUPS.has(key) ? (groupAutoTotal ? 'auto' : 'none') : 'manual')
      : 'manual';

    overviewTable.push({
      key,
      label: groupLabel,
      target: { value: finalTarget, source: targetManual === undefined ? 'budget' : 'manual' },
      actual: { value: finalActual, source },
      diff: round2(finalActual - finalTarget),
    });

    groupsBreakdown[key] = {
      totals: {
        autoActual: groupAutoTotal,
        manualActual: groupManualActual ?? null,
        finalActual,
        target: finalTarget,
      },
      items: rows,
      unassigned: {
        autoActual: unassignedAuto,
        finalActual: AUTO_GROUPS.has(key) ? unassignedAuto : 0,
      },
    };
  }

  const plannedExpenseTotal = round2(overviewTable
    .filter((row) => EXPENSE_GROUPS.includes(row.key))
    .reduce((sum, row) => sum + row.target.value, 0));

  const actualExpenseTotal = round2(overviewTable
    .filter((row) => EXPENSE_GROUPS.includes(row.key))
    .reduce((sum, row) => sum + row.actual.value, 0));

  return {
    monthKey,
    notes: budgetPlan.notes || '',
    kpis: {
      plannedExpenseTotal,
      actualExpenseTotal,
      remainingToSpend: round2(plannedExpenseTotal - actualExpenseTotal),
      isWithinBudget: actualExpenseTotal <= plannedExpenseTotal,
    },
    overviewTable,
    groupsBreakdown,
    editable,
  };
}
