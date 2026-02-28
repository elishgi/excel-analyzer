import test from 'node:test';
import assert from 'node:assert/strict';
import xlsx from 'xlsx';

import { parseDateStrict } from '../src/utils/normalizeExcel.js';
import { AppError } from '../src/utils/AppError.js';

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

test('parseDateStrict parses Excel serial numbers', () => {
  const serial = 45567;
  const expected = xlsx.SSF.parse_date_code(serial);

  const result = parseDateStrict(serial);

  assert.ok(result instanceof Date);
  assert.equal(toIsoDate(result), `${expected.y}-${String(expected.m).padStart(2, '0')}-${String(expected.d).padStart(2, '0')}`);
});

test('parseDateStrict parses yyyy-mm-dd format', () => {
  const result = parseDateStrict('2024-01-31');
  assert.equal(toIsoDate(result), '2024-01-31');
});

test('parseDateStrict parses dd/mm/yyyy format', () => {
  const result = parseDateStrict('31/01/2024');
  assert.equal(toIsoDate(result), '2024-01-31');
});

test('parseDateStrict returns null for empty values', () => {
  assert.equal(parseDateStrict(null), null);
  assert.equal(parseDateStrict(''), null);
});

test('parseDateStrict throws AppError for unsupported format', () => {
  assert.throws(() => parseDateStrict('01-31-2024'), (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.match(err.details, /Invalid date format: 01-31-2024/);
    return true;
  });
});

test('parseDateStrict throws AppError for invalid date parts', () => {
  assert.throws(() => parseDateStrict('2024-02-31'), (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.match(err.details, /Invalid date format: 2024-02-31/);
    return true;
  });
});
