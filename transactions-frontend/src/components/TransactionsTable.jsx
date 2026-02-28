import { formatDate, formatAmount } from '../utils/date.js';

export default function TransactionsTable({ transactions = [], loading, pagination, onPageChange }) {
  if (loading) return <div className="loading-full"><div className="spinner" /><span>טוען עסקאות...</span></div>;
  if (!transactions.length) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
      אין עסקאות להצגה
    </div>
  );

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>שם עסק</th>
              <th>סכום</th>
              <th>קטגוריה</th>
              <th>כרטיס</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx._id}>
                <td className="mono" style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</td>
                <td style={{ fontWeight: 500, color: 'var(--text)', maxWidth: 200 }} className="truncate">{tx.businessName}</td>
                <td className="mono" style={{ color: tx.amount < 0 ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap' }}>
                  {formatAmount(tx.amount)}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {tx.category === 'לא מסווג'
                    ? <span className="badge badge-red">לא מסווג</span>
                    : <span className="badge badge-gray">{tx.category}</span>
                  }
                </td>
                <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {tx.cardLast4 ? `****${tx.cardLast4}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
            ‹ הקודם
          </button>
          <span style={{ minWidth: 60, textAlign: 'center' }}>{pagination.page} / {pagination.pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => onPageChange(pagination.page + 1)}>
            הבא ›
          </button>
          <span style={{ marginRight: 'auto', color: 'var(--text-3)', fontSize: '0.75rem' }}>{pagination.total} סה"כ</span>
        </div>
      )}
    </>
  );
}
