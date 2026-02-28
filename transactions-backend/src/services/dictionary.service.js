import * as dal from '../dal/dictionaryRule.dal.js';
import { AppError } from '../utils/AppError.js';

export const getRules = (userId) => dal.getRulesByUser(userId);

export const addRule = (userId, body) => dal.createRule({ ...body, userId });

export async function editRule(id, userId, body) {
  const rule = await dal.updateRule(id, userId, body);
  if (!rule) throw new AppError('Rule not found', 404);
  return rule;
}

export async function removeRule(id, userId) {
  const rule = await dal.deleteRule(id, userId);
  if (!rule) throw new AppError('Rule not found', 404);
  return rule;
}
