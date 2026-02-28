import ImportBatch from '../models/importBatch.model.js';

export const createBatch = (data) => ImportBatch.create(data);

export const getBatchesByUser = (userId, { skip = 0, limit = 20 } = {}) =>
  ImportBatch.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

export const countBatchesByUser = (userId) =>
  ImportBatch.countDocuments({ userId });

export const getBatchById = (id, userId) =>
  ImportBatch.findOne({ _id: id, userId });

export const updateBatchStatus = (id, status) =>
  ImportBatch.findByIdAndUpdate(id, { status }, { new: true });

/** Hard delete — caller must also delete transactions */
export const deleteBatch = (id, userId) =>
  ImportBatch.findOneAndDelete({ _id: id, userId });
