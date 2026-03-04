import DraftImport from '../models/draftImport.model.js';

export const createDraft = (data) => DraftImport.create(data);
export const getDraft = (id, userId) => DraftImport.findOne({ _id: id, userId });
export const getDraftLean = (id, userId) => DraftImport.findOne({ _id: id, userId }).lean();
export const saveDraft = (draft) => draft.save();
export const markApproved = (id) => DraftImport.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
