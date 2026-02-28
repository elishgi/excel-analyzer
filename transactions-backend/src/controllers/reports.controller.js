import * as reportsService from '../services/reports.service.js';

export async function getSummary(req, res, next) {
  try {
    const result = await reportsService.getSummary(req.user.id, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTopMerchants(req, res, next) {
  try {
    const result = await reportsService.getTopMerchants(req.user.id, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
