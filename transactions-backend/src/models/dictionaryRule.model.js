import mongoose from 'mongoose';

const dictionaryRuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  matchType: { type: String, enum: ['exact', 'contains', 'regex'], required: true },
  pattern: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  priority: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('DictionaryRule', dictionaryRuleSchema);
