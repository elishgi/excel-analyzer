import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',           required: true },
  importBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportBatch',    required: true },
  date:          { type: Date,   required: true },
  businessName:  { type: String, required: true, trim: true },
  amount:        { type: Number, required: true },
  cardLast4:     { type: String, trim: true },
  rawDescription:{ type: String, trim: true },
  category:      { type: String, trim: true },
  matchedRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'DictionaryRule', default: null },
  createdAt:     { type: Date,   default: Date.now },
});

// ── Compound indexes for reports / filters ────────────────────────────────────
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, importBatchId: 1 });

export default mongoose.model('Transaction', transactionSchema);
