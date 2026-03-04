import TemplateRow from '../models/templateRow.model.js';

export const listTemplates = (userId) => TemplateRow.find({ userId, isActive: true }).sort({ createdAt: 1 }).lean();
export const createTemplate = (data) => TemplateRow.create(data);
export const deactivateTemplate = (id, userId) => TemplateRow.findOneAndUpdate({ _id: id, userId }, { isActive: false }, { new: true });
