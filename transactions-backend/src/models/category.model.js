import mongoose from 'mongoose';
import { BOX_KEYS } from '../config/boxKeys.js';

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  boxKey: { type: String, enum: Object.values(BOX_KEYS), required: true },
  color: { type: String, default: '#7c3aed' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);
