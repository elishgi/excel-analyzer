import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/transaction.model.js';
import DictionaryRule from '../models/dictionaryRule.model.js';
import Category from '../models/category.model.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
const users = await Transaction.distinct('userId');
for (const userId of users) {
  const names = await Transaction.distinct('category', { userId, category: { $nin: [null, '', 'לא מסווג'] } });
  for (const name of names) {
    const cat = await Category.findOneAndUpdate({ userId, name }, { $setOnInsert: { boxKey: 'VARIABLE' } }, { upsert: true, new: true });
    await Transaction.updateMany({ userId, category: name, categoryId: null }, { $set: { categoryId: cat._id } });
    await DictionaryRule.updateMany({ userId, category: name, categoryId: null }, { $set: { categoryId: cat._id } });
  }
}
console.log('compat migration complete');
await mongoose.disconnect();
