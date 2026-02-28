import * as budgetsService from '../services/budgets.service.js';

export async function getBudget(req, res, next) {
  try {
    const result = await budgetsService.getBudgetPlan(req.user.id, req.params.monthKey);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function putBudget(req, res, next) {
  try {
    const result = await budgetsService.upsertBudgetPlan(req.user.id, req.params.monthKey, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
