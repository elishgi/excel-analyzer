import { formatAmount } from '../utils/date.js';

export default function SummaryCards({ total, txCount, uncategorizedCount, loading }) {
  const cards = [
    { label: 'סה"כ הוצאות', value: loading ? '...' : formatAmount(total), accent: true },
    { label: 'עסקאות',      value: loading ? '...' : txCount?.toLocaleString('he-IL') ?? '—' },
    { label: 'לא מסווג',    value: loading ? '...' : uncategorizedCount?.toLocaleString('he-IL') ?? '—', warn: uncategorizedCount > 0 },
  ];

  return (
    <div className="grid-3" style={{ marginBottom: 20 }}>
      {cards.map(({ label, value, accent, warn }) => (
        <div key={label} className="card" style={{
          borderColor: accent ? 'var(--accent-dim)' : warn ? 'var(--red-dim)' : undefined,
          position: 'relative', overflow: 'hidden',
          padding: '16px 20px',
        }}>
          {accent && (
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 3, height: '100%',
              background: 'var(--accent)',
            }} />
          )}
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {label}
          </div>
          <div style={{
            fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
            fontFamily: 'var(--mono)',
            fontWeight: 600,
            color: accent ? 'var(--accent)' : warn ? 'var(--red)' : 'var(--text)',
            lineHeight: 1.2,
          }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
