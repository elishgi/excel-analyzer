import BudgetPlan from '../models/BudgetPlan.js';
import Transaction from '../models/transaction.model.js';
import Category from '../models/category.model.js';
import { BOX_ORDER, BOX_TITLES_HE, EXPENSE_BOXES, BOX_KEYS } from '../config/boxKeys.js';
import { getMonthDateRange, validateMonthKey } from '../utils/budgets.js';
import * as templateDal from '../dal/templateRow.dal.js';
import { AppError } from '../utils/AppError.js';

function round2(n) { return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100; }

async function ensurePlan(userId, monthKey) {
  let plan = await BudgetPlan.findOne({ userId, monthKey });
  if (!plan) {
    const templates = await templateDal.listTemplates(userId);
    const manualRows = {
      INCOME: [], SUBSCRIPTIONS: [], VARIABLE: [], SAVINGS: [], TITHES: [], MANUAL_EXPENSES: [],
    };
    for (const t of templates) manualRows[t.boxKey].push({ name: t.name, target: t.target, actual: 0, isTemplateSeeded: true, templateRowId: t._id });
    plan = await BudgetPlan.create({ userId, monthKey, manualRows, categoryTargets: [] });
  }
  return plan;
}

export async function getMonthlyDashboard(userId, monthKey) {
  validateMonthKey(monthKey);
  const { start, nextMonthStart } = getMonthDateRange(monthKey);
  const [plan, categories, txs] = await Promise.all([
    ensurePlan(userId, monthKey),
    Category.find({ userId, isActive: true }).lean(),
    Transaction.find({ userId, date: { $gte: start, $lt: nextMonthStart } }).populate('categoryId').lean(),
  ]);

  const actualByCategory = new Map();
  txs.forEach((t) => {
    const id = String(t.categoryId?._id || t.categoryId || '');
    if (!id) return;
    actualByCategory.set(id, round2((actualByCategory.get(id) || 0) + Math.abs(t.amount)));
  });
  const targetByCategory = new Map((plan.categoryTargets || []).map((c) => [String(c.categoryId), c.target]));

  const boxes = BOX_ORDER.map((boxKey) => {
    const autoRows = categories
      .filter((c) => c.boxKey === boxKey)
      .map((c) => ({ categoryId: c._id, name: c.name, target: round2(targetByCategory.get(String(c._id)) || 0), actual: round2(actualByCategory.get(String(c._id)) || 0) }))
      .filter((r) => r.actual > 0);
    const manualRows = (plan.manualRows?.[boxKey] || []).map((r) => ({ id: r._id, name: r.name, target: round2(r.target), actual: round2(r.actual), isTemplateSeeded: !!r.isTemplateSeeded }));
    const totals = {
      target: round2(autoRows.reduce((s, r) => s + r.target, 0) + manualRows.reduce((s, r) => s + r.target, 0)),
      actual: round2(autoRows.reduce((s, r) => s + r.actual, 0) + manualRows.reduce((s, r) => s + r.actual, 0)),
    };
    totals.diff = round2(totals.actual - totals.target);
    return { boxKey, title: BOX_TITLES_HE[boxKey], autoRows, manualRows, totals };
  });

  const incomeActual = boxes.find((b) => b.boxKey === BOX_KEYS.INCOME)?.totals.actual || 0;
  const expensesActual = boxes.filter((b) => EXPENSE_BOXES.includes(b.boxKey)).reduce((s, b) => s + b.totals.actual, 0);

  return {
    monthKey,
    locked: !!plan.locked,
    summary: { incomeActual: round2(incomeActual), expensesActual: round2(expensesActual), balance: round2(incomeActual - expensesActual) },
    boxes,
    charts: {
      pie: boxes.filter((b) => EXPENSE_BOXES.includes(b.boxKey)).map((b) => ({ name: b.title, value: b.totals.actual, boxKey: b.boxKey })),
      donut: { incomeActual: round2(incomeActual), expensesActual: round2(expensesActual), remaining: round2(incomeActual - expensesActual) },
      line: BOX_ORDER.map((k) => {
        const box = boxes.find((b) => b.boxKey === k);
        return { boxKey: k, name: box.title, planned: box.totals.target, actual: box.totals.actual };
      }),
    },
  };
}

export async function patchMonthlyCell(userId, monthKey, payload) {
  const plan = await ensurePlan(userId, monthKey);
  if (plan.locked) throw new AppError('Month is locked', 409);

  if (payload.type === 'categoryTarget') {
    const idx = (plan.categoryTargets || []).findIndex((x) => String(x.categoryId) === payload.categoryId);
    if (idx >= 0) plan.categoryTargets[idx].target = Number(payload.target || 0);
    else plan.categoryTargets.push({ categoryId: payload.categoryId, target: Number(payload.target || 0) });
  } else if (payload.type === 'manualRowAdd') {
    const row = { name: payload.name, target: Number(payload.target || 0), actual: Number(payload.actual || 0), isTemplateSeeded: false };
    plan.manualRows[payload.boxKey].push(row);
    if (payload.saveAsTemplate) await templateDal.createTemplate({ userId, boxKey: payload.boxKey, name: payload.name, target: Number(payload.target || 0), isActive: true });
  } else if (payload.type === 'manualRowUpdate') {
    const row = plan.manualRows[payload.boxKey].id(payload.rowId);
    if (!row) throw new AppError('Row not found', 404);
    if (payload.name !== undefined) row.name = payload.name;
    if (payload.target !== undefined) row.target = Number(payload.target);
    if (payload.actual !== undefined) row.actual = Number(payload.actual);
  } else if (payload.type === 'manualRowDelete') {
    const row = plan.manualRows[payload.boxKey].id(payload.rowId);
    if (!row) throw new AppError('Row not found', 404);
    const templateId = row.templateRowId;
    row.deleteOne();
    if (payload.removeTemplateFuture && templateId) await templateDal.deactivateTemplate(templateId, userId);
  }

  await plan.save();
  return getMonthlyDashboard(userId, monthKey);
}

export async function closeMonth(userId, monthKey) {
  const plan = await ensurePlan(userId, monthKey);
  const dashboard = await getMonthlyDashboard(userId, monthKey);
  plan.locked = true;
  await plan.save();

  const rows = dashboard.boxes.flatMap((box) => [...box.autoRows, ...box.manualRows]);
  const met = rows.filter((r) => r.actual >= r.target).length;
  const topExpenses = dashboard.charts.pie.sort((a, b) => b.value - a.value).slice(0, 3);
  const heaviestCategory = topExpenses[0]?.name || null;

  return {
    locked: true,
    summary: dashboard.summary,
    achievement: { metRows: met, totalRows: rows.length, percent: rows.length ? round2((met / rows.length) * 100) : 0 },
    heaviestCategory,
    topExpenses,
  };
}
