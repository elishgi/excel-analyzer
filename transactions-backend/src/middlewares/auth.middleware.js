import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Authorization header is missing', 401);
    }
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header must use Bearer scheme', 401);
    }

    const token = authHeader.slice(7); // more explicit than split
    if (!token) {
      throw new AppError('Bearer token is empty', 401);
    }

    const decoded = verifyToken(token);
    req.user = { id: String(decoded.id), email: decoded.email }; // normalize id to string
    next();
  } catch (err) {
    next(err);
  }
}
