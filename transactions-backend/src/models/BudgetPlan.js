import mongoose from 'mongoose';

const budgetLineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0 },
}, { _id: false });

const budgetLineWithDaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  dayInMonth: { type: Number, min: 1, max: 31 },
  targetAmount: { type: Number, required: true, min: 0 },
}, { _id: false });

const budgetPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  monthKey: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/,
  },
  incomeLines: {
    type: [budgetLineSchema],
    default: [],
  },
  groups: {
    fixedBills: { type: [budgetLineWithDaySchema], default: [] },
    variableExpenses: { type: [budgetLineSchema], default: [] },
    loansCash: { type: [budgetLineSchema], default: [] },
    tithes: { type: [budgetLineWithDaySchema], default: [] },
    savings: { type: [budgetLineSchema], default: [] },
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

budgetPlanSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export default mongoose.model('BudgetPlan', budgetPlanSchema);
