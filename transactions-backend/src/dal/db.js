import mongoose from 'mongoose';

export async function connectDB() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL is not defined in environment variables');

  try {
    await mongoose.connect(url);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}
