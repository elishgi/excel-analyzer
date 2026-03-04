import * as categoryDal from '../dal/category.dal.js';
import { AppError } from '../utils/AppError.js';

export const getCategories = (userId) => categoryDal.listByUser(userId);

export const createCategory = (userId, body) => categoryDal.createCategory({ userId, ...body });

export async function patchCategory(id, userId, body) {
  const updated = await categoryDal.updateCategory(id, userId, body);
  if (!updated) throw new AppError('Category not found', 404);
  return updated;
}

export async function removeCategory(id, userId, replacementCategoryId) {
  const count = await categoryDal.countTransactionsForCategory(userId, id);
  if (count > 0 && !replacementCategoryId) {
    throw new AppError('CATEGORY_IN_USE', 409, { affectedTransactions: count });
  }

  if (count > 0) await categoryDal.reassignTransactionsCategory(userId, id, replacementCategoryId);

  const deleted = await categoryDal.deleteCategory(id, userId);
  if (!deleted) throw new AppError('Category not found', 404);
  return { deleted: true, reassigned: count };
}
