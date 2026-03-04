import * as dictionaryService from '../services/dictionary.service.js';
import { validateDictionaryRule } from '../utils/validate.js';

export async function getRules(req, res, next) {
  try {
    const rules = await dictionaryService.getRules(req.user.id);
    res.json(rules);
  } catch (err) {
    next(err);
  }
}

export async function addRule(req, res, next) {
  try {
    const body = req.body ?? {};
    validateDictionaryRule(body);

    const { matchType, pattern, categoryId, priority, conditions } = body;
    const rule = await dictionaryService.addRule(req.user.id, { matchType, pattern: pattern.trim(), categoryId, priority, conditions });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

export async function updateRule(req, res, next) {
  try {
    const body = req.body ?? {};
    validateDictionaryRule(body, { isUpdate: true });

    const allowed = {};
    if (body.matchType !== undefined) allowed.matchType = body.matchType;
    if (body.pattern !== undefined) allowed.pattern = body.pattern.trim();
    if (body.categoryId !== undefined) allowed.categoryId = body.categoryId;
    if (body.priority !== undefined) allowed.priority = body.priority;
    if (body.conditions !== undefined) allowed.conditions = body.conditions;

    const rule = await dictionaryService.editRule(req.params.id, req.user.id, allowed);
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

export async function deleteRule(req, res, next) {
  try {
    await dictionaryService.removeRule(req.params.id, req.user.id);
    res.json({ message: 'Rule deleted successfully' });
  } catch (err) {
    next(err);
  }
}
