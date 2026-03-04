import * as dal from '../dal/dictionaryRule.dal.js';
import { AppError } from '../utils/AppError.js';

export async function getRules(userId) {
  const rules = await dal.getRulesByUser(userId);
  const grouped = {};
  for (const rule of rules) {
    const categoryKey = rule.categoryId?._id?.toString() || 'unknown';
    if (!grouped[categoryKey]) grouped[categoryKey] = { category: rule.categoryId || null, rules: [] };
    grouped[categoryKey].rules.push(rule);
  }
  return Object.values(grouped);
}

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
