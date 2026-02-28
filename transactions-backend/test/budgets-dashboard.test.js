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
  assert.deepEqual(data.groupsBreakdown.fixedBills, []);
  assert.equal(data.groupsBreakdown.unassignedByGroup.fixedBills, 0);
});

test('createDefaultBudget returns the expected empty template', () => {
  const budget = createDefaultBudget('2026-02');

  assert.equal(budget.monthKey, '2026-02');
  assert.deepEqual(budget.incomeLines, []);
  assert.equal(budget.notes, '');
  assert.deepEqual(budget.groups.variableExpenses, []);
});
