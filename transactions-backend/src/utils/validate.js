import { AppError } from './AppError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MATCH_TYPES = ['exact', 'contains', 'regex'];

/**
 * Validates signup body.
 * @throws {AppError} 400 on invalid input
 */
export function validateSignup({ name, email, password }) {
  const details = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    details.push('name is required');
  }
  if (!email || !EMAIL_RE.test(email)) {
    details.push('a valid email is required');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    details.push('password must be at least 6 characters');
  }

  if (details.length > 0) {
    throw new AppError('Validation failed', 400, details);
  }
}

/**
 * Validates login body.
 * @throws {AppError} 400 on invalid input
 */
export function validateLogin({ email, password }) {
  const details = [];

  if (!email || !EMAIL_RE.test(email)) {
    details.push('a valid email is required');
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    details.push('password is required');
  }

  if (details.length > 0) {
    throw new AppError('Validation failed', 400, details);
  }
}

/**
 * Validates dictionary rule body (used for both create and update).
 * On update, all fields are optional — pass isUpdate=true.
 * @throws {AppError} 400 on invalid input
 */
export function validateDictionaryRule(body, { isUpdate = false } = {}) {
  const { matchType, pattern, category, priority } = body;
  const details = [];

  if (!isUpdate || matchType !== undefined) {
    if (!matchType || !MATCH_TYPES.includes(matchType)) {
      details.push(`matchType must be one of: ${MATCH_TYPES.join(', ')}`);
    }
  }
  if (!isUpdate || pattern !== undefined) {
    if (!pattern || typeof pattern !== 'string' || pattern.trim().length === 0) {
      details.push('pattern is required and must be a non-empty string');
    }
    // Extra: validate regex patterns are actually valid
    if (matchType === 'regex' && pattern) {
      try {
        new RegExp(pattern);
      } catch {
        details.push('pattern is not a valid regular expression');
      }
    }
  }
  if (!isUpdate || category !== undefined) {
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      details.push('category is required and must be a non-empty string');
    }
  }
  if (!isUpdate || priority !== undefined) {
    if (priority === undefined || priority === null || typeof priority !== 'number' || !Number.isFinite(priority)) {
      details.push('priority must be a finite number');
    }
  }

  if (details.length > 0) {
    throw new AppError('Validation failed', 400, details);
  }
}
