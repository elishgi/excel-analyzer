import mongoose from 'mongoose';
import { BOX_KEYS } from '../config/boxKeys.js';

const templateRowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  boxKey: { type: String, enum: Object.values(BOX_KEYS), required: true },
  name: { type: String, required: true, trim: true },
  target: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('TemplateRow', templateRowSchema);
