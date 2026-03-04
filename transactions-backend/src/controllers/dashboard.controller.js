import { getMonthlyDashboard, patchMonthlyCell, closeMonth } from '../services/dashboard.service.js';

export async function getMonthly(req, res, next) {
  try { res.json(await getMonthlyDashboard(req.user.id, req.query.monthKey)); } catch (err) { next(err); }
}

export async function patchMonthly(req, res, next) {
  try { res.json(await patchMonthlyCell(req.user.id, req.body.monthKey, req.body)); } catch (err) { next(err); }
}

export async function closeMonthly(req, res, next) {
  try { res.json(await closeMonth(req.user.id, req.body.monthKey)); } catch (err) { next(err); }
}
