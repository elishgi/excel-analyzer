import * as service from '../services/categories.service.js';
import { BOX_KEYS } from '../config/boxKeys.js';
import { AppError } from '../utils/AppError.js';

export async function listCategories(req, res, next) {
  try { res.json(await service.getCategories(req.user.id)); } catch (e) { next(e); }
}

export async function createCategory(req, res, next) {
  try {
    const { name, boxKey, color, order } = req.body ?? {};
    if (!name || !boxKey) throw new AppError('name ו-boxKey הם שדות חובה', 400);
    if (!Object.values(BOX_KEYS).includes(boxKey)) throw new AppError('boxKey לא חוקי', 400);
    res.status(201).json(await service.createCategory(req.user.id, { name: String(name).trim(), boxKey, color, order }));
  } catch (e) { next(e); }
}

export async function patchCategory(req, res, next) {
  try {
    const body = { ...req.body };
    if (body.boxKey && !Object.values(BOX_KEYS).includes(body.boxKey)) throw new AppError('boxKey לא חוקי', 400);
    res.json(await service.patchCategory(req.params.id, req.user.id, body));
  } catch (e) { next(e); }
}

export async function deleteCategory(req, res, next) {
  try {
    const replacementCategoryId = req.body?.replacementCategoryId;
    res.json(await service.removeCategory(req.params.id, req.user.id, replacementCategoryId));
  } catch (e) { next(e); }
}
