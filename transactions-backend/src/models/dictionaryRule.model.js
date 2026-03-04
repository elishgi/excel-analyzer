import mongoose from 'mongoose';

const dictionaryRuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  matchType: { type: String, enum: ['exact', 'contains', 'regex'], required: true },
  pattern: { type: String, required: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  category: { type: String, trim: true }, // legacy compat
  priority: { type: Number, required: true, default: 0 },
  conditions: {
    sourceType: { type: String, enum: ['visa', 'max', null], default: null },
    last4: { type: String, default: null },
    dateFrom: { type: Date, default: null },
    dateTo: { type: Date, default: null },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('DictionaryRule', dictionaryRuleSchema);
