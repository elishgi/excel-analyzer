import Category from '../models/category.model.js';
import Transaction from '../models/transaction.model.js';

export const listByUser = (userId) => Category.find({ userId }).sort({ order: 1, name: 1 }).lean();
export const createCategory = (data) => Category.create(data);
export const updateCategory = (id, userId, data) => Category.findOneAndUpdate({ _id: id, userId }, data, { new: true, runValidators: true });
export const getById = (id, userId) => Category.findOne({ _id: id, userId });

export const countTransactionsForCategory = (userId, categoryId) => Transaction.countDocuments({ userId, categoryId });
export const reassignTransactionsCategory = (userId, fromCategoryId, toCategoryId) =>
  Transaction.updateMany({ userId, categoryId: fromCategoryId }, { $set: { categoryId: toCategoryId } });

export const deleteCategory = (id, userId) => Category.findOneAndDelete({ _id: id, userId });
