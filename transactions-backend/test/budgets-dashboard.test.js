import test from 'node:test';
import assert from 'node:assert/strict';

import { validateMonthKey, createDefaultBudget } from '../src/utils/budgets.js';
import { buildMonthlyDashboardData } from '../src/utils/dashboardBuilder.js';

test('validateMonthKey accepts valid YYYY-MM', () => {
  assert.doesNotThrow(() => validateMonthKey('2026-02'));
});

test('validateMonthKey rejects invalid format', () => {
  assert.throws(() => validateMonthKey('2026/02'));
  assert.throws(() => validateMonthKey('2026-13'));
});

test('buildMonthlyDashboardData returns defaults when budget plan is missing', () => {
  const data = buildMonthlyDashboardData(null, [], '2026-02');

  assert.equal(data.monthKey, '2026-02');
  assert.equal(data.kpis.plannedExpenseTotal, 0);
  assert.equal(data.kpis.actualExpenseTotal, 0);
  assert.equal(data.overviewTable.length, 6);
  assert.deepEqual(data.groupsBreakdown.fixedBills.items, []);
  assert.equal(data.groupsBreakdown.fixedBills.unassigned.autoActual, 0);
  assert.ok(data.editable.cells.includes('overview.fixedBills.target'));
});

test('buildMonthlyDashboardData supports manual actual override', () => {
  const budget = createDefaultBudget('2026-02');
  budget.targets.fixedBills = 500;
  budget.manualActuals.fixedBills = 450;

  const data = buildMonthlyDashboardData(budget, [{ businessName: 'rent', amount: 1000, category: 'rent', date: new Date() }], '2026-02');
  const fixed = data.overviewTable.find((row) => row.key === 'fixedBills');

  assert.equal(fixed.actual.source, 'manual');
  assert.equal(fixed.actual.value, 450);
});

test('createDefaultBudget returns the expected empty template', () => {
  const budget = createDefaultBudget('2026-02');

  assert.equal(budget.monthKey, '2026-02');
  assert.equal(budget.notes, '');
  assert.deepEqual(budget.manualCells, []);
  assert.equal(budget.targets.variableExpenses, 0);
});
