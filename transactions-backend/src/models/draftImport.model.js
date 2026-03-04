import mongoose from 'mongoose';
import { BOX_KEYS } from '../config/boxKeys.js';

const draftRowSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  merchantName: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  last4: { type: String, default: null },
  sourceType: { type: String, enum: ['visa', 'max'], required: true },
  suggestedCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  boxKey: { type: String, enum: [...Object.values(BOX_KEYS), null], default: null },
  flags: { type: [String], default: [] },
  ignored: { type: Boolean, default: false },
}, { _id: true });

const draftImportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'approved', 'expired'], default: 'draft' },
  fileNames: { type: [String], default: [] },
  rows: { type: [draftRowSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('DraftImport', draftImportSchema);
