export function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toInputDate(val) {
  if (!val) return '';
  return new Date(val).toISOString().slice(0, 10);
}

export function formatAmount(num) {
  if (num == null) return '—';
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2 }).format(num);
}

export function formatMonth(ym) {
  if (!ym) return ym;
  const [y, m] = ym.split('-');
  const d = new Date(+y, +m - 1, 1);
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}
