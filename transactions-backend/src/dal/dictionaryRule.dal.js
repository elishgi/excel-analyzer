import DictionaryRule from '../models/dictionaryRule.model.js';

export const getRulesByUser = (userId) =>
  DictionaryRule.find({ userId }).sort({ priority: -1, createdAt: -1 });

export const createRule = (data) => DictionaryRule.create(data);

export const updateRule = (id, userId, data) =>
  DictionaryRule.findOneAndUpdate({ _id: id, userId }, data, { new: true, runValidators: true });

export const deleteRule = (id, userId) =>
  DictionaryRule.findOneAndDelete({ _id: id, userId });
