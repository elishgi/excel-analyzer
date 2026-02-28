import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../dal/user.dal.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;

export async function signup({ name, email, password }) {
  const existing = await findUserByEmail(email);
  if (existing) throw new AppError('Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ name, email, passwordHash });

  const token = signToken({ id: user._id, email: user.email });
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}

export async function login({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const token = signToken({ id: user._id, email: user.email });
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}
