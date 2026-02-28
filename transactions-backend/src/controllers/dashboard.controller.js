import { getMonthlyDashboard } from '../services/dashboard.service.js';

export async function getMonthly(req, res, next) {
  try {
    const result = await getMonthlyDashboard(req.user.id, req.query.monthKey);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
