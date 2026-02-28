import mongoose from 'mongoose';

const amountField = { type: Number, min: 0, default: 0 };

const groupItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  dayInMonth: { type: Number, min: 1, max: 31 },
  targetAmount: { type: Number, required: true, min: 0, default: 0 },
  manualActual: { type: Number, min: 0, default: null },
}, { _id: false });

const manualCellSchema = new mongoose.Schema({
  path: { type: String, required: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  updatedAt: { type: Date, default: Date.now },
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
  notes: { type: String, default: '' },
  targets: {
    fixedBills: amountField,
    variableExpenses: amountField,
    income: amountField,
    savings: amountField,
    loansCash: amountField,
    tithes: amountField,
  },
  manualActuals: {
    fixedBills: { type: Number, min: 0, default: null },
    variableExpenses: { type: Number, min: 0, default: null },
    income: { type: Number, min: 0, default: null },
    savings: { type: Number, min: 0, default: null },
    loansCash: { type: Number, min: 0, default: null },
    tithes: { type: Number, min: 0, default: null },
  },
  manualCells: {
    type: [manualCellSchema],
    default: [],
  },
  groupItems: {
    fixedBillsItems: { type: [groupItemSchema], default: [] },
    variableItems: { type: [groupItemSchema], default: [] },
    loansCashItems: { type: [groupItemSchema], default: [] },
    tithesItems: { type: [groupItemSchema], default: [] },
    savingsItems: { type: [groupItemSchema], default: [] },
    incomeItems: { type: [groupItemSchema], default: [] },
  },
  // backward compatibility
  incomeLines: { type: [groupItemSchema], default: [] },
  groups: {
    fixedBills: { type: [groupItemSchema], default: [] },
    variableExpenses: { type: [groupItemSchema], default: [] },
    loansCash: { type: [groupItemSchema], default: [] },
    tithes: { type: [groupItemSchema], default: [] },
    savings: { type: [groupItemSchema], default: [] },
  },
}, { timestamps: true });

budgetPlanSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export default mongoose.model('BudgetPlan', budgetPlanSchema);
