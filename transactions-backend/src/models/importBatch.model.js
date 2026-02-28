import mongoose from 'mongoose';

const importBatchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceType: { type: String, enum: ['max', 'visa'], required: true },
  originalFileName: { type: String, required: true },
  status: { type: String, enum: ['processing', 'done', 'failed'], default: 'processing' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ImportBatch', importBatchSchema);
