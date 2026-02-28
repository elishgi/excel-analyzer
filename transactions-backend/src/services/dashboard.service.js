import * as dashboardDal from '../dal/dashboard.dal.js';
import * as budgetsDal from '../dal/budgets.dal.js';
import { getMonthDateRange, validateMonthKey } from '../utils/budgets.js';
import { buildMonthlyDashboardData } from '../utils/dashboardBuilder.js';

export async function getMonthlyDashboard(userId, monthKey) {
  validateMonthKey(monthKey);

  const { start, nextMonthStart } = getMonthDateRange(monthKey);
  const [budgetPlanRaw, monthTransactions] = await Promise.all([
    budgetsDal.findBudgetPlan(userId, monthKey),
    dashboardDal.getTransactionsByMonth(userId, start, nextMonthStart),
  ]);

  return buildMonthlyDashboardData(budgetPlanRaw, monthTransactions, monthKey);
}
