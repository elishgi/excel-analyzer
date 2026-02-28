import xlsx from 'xlsx';
import { AppError } from './AppError.js';

// ── Text cleanup ───────────────────────────────────────────────────────────────
function cleanText(val) {
  if (val == null) return null;
  return String(val)
    .replace(/[\x00-\x1F\x7F]/g, ' ') // control chars
    .replace(/\s+/g, ' ')              // multiple spaces
    .trim();
}

function cleanAmount(val) {
  if (val == null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function buildUtcDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValid ? date : null;
}

export function parseDateStrict(val) {
  if (val == null || val === '') return null;

  if (typeof val === 'number') {
    const parsed = xlsx.SSF.parse_date_code(val);
    if (!parsed) {
      throw new AppError('תאריך לא תקין', 400, `Invalid date format: ${val}`);
    }

    const serialDate = buildUtcDate(parsed.y, parsed.m, parsed.d);
    if (!serialDate) {
      throw new AppError('תאריך לא תקין', 400, `Invalid date format: ${val}`);
    }

    return serialDate;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      const date = buildUtcDate(Number(y), Number(m), Number(d));
      if (!date) {
        throw new AppError('תאריך לא תקין', 400, `Invalid date format: ${val}`);
      }
      return date;
    }

    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, d, m, y] = slashMatch;
      const date = buildUtcDate(Number(y), Number(m), Number(d));
      if (!date) {
        throw new AppError('תאריך לא תקין', 400, `Invalid date format: ${val}`);
      }
      return date;
    }
  }

  throw new AppError('תאריך לא תקין', 400, `Invalid date format: ${val}`);
}

function cleanDate(val) {
  return parseDateStrict(val);
}

// ── Column alias maps ──────────────────────────────────────────────────────────
// Each entry: [canonical, [...aliases]]
const COLUMN_ALIASES = {
  date: [
    'תאריך', 'תאריך עסקה', 'תאריך רכישה', 'תאריך חיוב',
    'date', 'transaction date', 'purchase date',
  ],
  businessName: [
    'שם בית עסק', 'בית עסק', 'תיאור', 'שם העסק', 'פירוט',
    'merchant', 'business name', 'description', 'name',
  ],
  amount: [
    'סכום', 'סכום חיוב', 'סכום עסקה', 'סכום בש"ח', 'חיוב',
    'amount', 'charge', 'debit', 'transaction amount',
  ],
  cardLast4: [
    '4 ספרות אחרונות', 'כרטיס', 'מספר כרטיס', 'last 4',
    'card', 'card number', 'card last 4',
  ],
  rawDescription: [
    'פירוט נוסף', 'הערות', 'תיאור נוסף', 'remarks',
    'notes', 'memo', 'extra description',
  ],
};

function normalizeHeader(h) {
  return String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildColumnMap(headers) {
  const map = {}; // canonical → index
  headers.forEach((h, i) => {
    const norm = normalizeHeader(h);
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((a) => normalizeHeader(a) === norm)) {
        if (!(canonical in map)) map[canonical] = i; // first match wins
      }
    }
  });
  return map;
}

// ── Parse sheet rows into normalized transactions ─────────────────────────────
function parseSheet(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // Find the header row (first row that has at least 2 non-empty cells)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const nonEmpty = rows[i].filter((c) => c != null && String(c).trim() !== '');
    if (nonEmpty.length >= 2) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) throw new AppError('לא נמצאה שורת כותרת בקובץ', 400);

  const headers = rows[headerRowIdx];
  const colMap = buildColumnMap(headers);

  // Validate required columns
  const missing = ['date', 'businessName', 'amount'].filter((c) => !(c in colMap));
  if (missing.length > 0) {
    throw new AppError(
      'עמודות חובה חסרות בקובץ האקסל',
      400,
      missing.map((c) => `עמודה חסרה: ${c}`)
    );
  }

  const dataRows = rows.slice(headerRowIdx + 1);
  const transactions = [];

  for (const row of dataRows) {
    // Skip empty rows
    if (!row || row.every((c) => c == null || String(c).trim() === '')) continue;

    const date = cleanDate(row[colMap.date]);
    const businessName = cleanText(row[colMap.businessName]);
    const amount = cleanAmount(row[colMap.amount]);

    // Skip rows missing critical data
    if (!date || !businessName || amount == null) continue;

    transactions.push({
      date,
      businessName,
      amount,
      cardLast4: colMap.cardLast4 != null ? cleanText(row[colMap.cardLast4]) : null,
      rawDescription: colMap.rawDescription != null ? cleanText(row[colMap.rawDescription]) : null,
    });
  }

  return transactions;
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * @param {Buffer} buffer  - raw file buffer
 * @param {'max'|'visa'} sourceType
 * @returns {{ date, businessName, amount, cardLast4, rawDescription }[]}
 */
export function normalizeExcel(buffer, sourceType) {
  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  } catch {
    throw new AppError('הקובץ אינו קובץ Excel תקין', 400);
  }

  if (!workbook.SheetNames.length) {
    throw new AppError('קובץ Excel ריק – אין גיליונות', 400);
  }

  // Try each sheet, return first one that yields transactions
  const errors = [];
  for (const name of workbook.SheetNames) {
    try {
      const result = parseSheet(workbook.Sheets[name]);
      if (result.length > 0) return result;
    } catch (err) {
      errors.push(err.message);
    }
  }

  // All sheets failed
  const lastErr = errors[errors.length - 1];
  throw new AppError(lastErr || 'לא נמצאו עסקאות בקובץ', 400);
}
