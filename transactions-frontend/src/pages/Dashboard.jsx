import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import SummaryCards from '../components/SummaryCards.jsx';
import SummaryChart from '../components/SummaryChart.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { formatDate, formatAmount } from '../utils/date.js';
import { downloadExport } from '../utils/download.js';

const STATUS_BADGE = {
  done:       <span className="badge badge-green">הושלם</span>,
  processing: <span className="badge badge-yellow">מעבד...</span>,
  failed:     <span className="badge badge-red">נכשל</span>,
};

// Detect mobile once
const isMobile = () => window.innerWidth <= 640;

export default function Dashboard() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(isMobile());

  const [summary,    setSummary]    = useState([]);
  const [merchants,  setMerchants]  = useState([]);
  const [batches,    setBatches]    = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page,       setPage]       = useState(1);
  const [totals,     setTotals]     = useState({ total: 0, txCount: 0, uncategorizedCount: 0 });
  const [loading,       setLoading]       = useState(true);
  const [bLoading,      setBLoading]      = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [confirmModal,  setConfirmModal]  = useState({ open: false, batchId: null });
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  useEffect(() => {
    const handler = () => setMobile(isMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { groupBy: 'category', includeUncategorized: 'false' };
      if (from) params.from = from;
      if (to)   params.to   = to;
      const [sumRes, merRes, uncatRes] = await Promise.all([
        api.get('/api/reports/summary', { params }),
        api.get('/api/reports/top-merchants', { params: { limit: 8, ...params } }),
        api.get('/api/transactions/uncategorized', { params: { limit: 1 } }),
      ]);
      setSummary(sumRes.data.data || []);
      setMerchants(merRes.data.data || []);
      const total   = (sumRes.data.data || []).reduce((s, r) => s + r.totalAmount, 0);
      const txCount = (sumRes.data.data || []).reduce((s, r) => s + r.txCount, 0);
      setTotals({ total, txCount, uncategorizedCount: uncatRes.data.pagination?.total ?? 0 });
    } catch { toast.error('שגיאה בטעינת הדוחות'); }
    finally { setLoading(false); }
  }, [from, to]);

  const loadBatches = useCallback(async (p = 1) => {
    setBLoading(true);
    try {
      const { data } = await api.get('/api/imports', { params: { page: p, limit: 10 } });
      setBatches(data.data || []);
      setPagination(data.pagination);
    } finally { setBLoading(false); }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);
  useEffect(() => { loadBatches(page); }, [loadBatches, page]);

  const handleDelete = async () => {
    const id = confirmModal.batchId;
    setConfirmModal({ open: false, batchId: null });
    setActionLoading(id + '-del');
    try {
      await api.delete(`/api/imports/${id}`);
      toast.success('הבאץ׳ נמחק בהצלחה');
      loadBatches(page); loadReports();
    } catch (e) { toast.error(e.response?.data?.message || 'שגיאה במחיקה'); }
    finally { setActionLoading(''); }
  };

  const handleRecategorize = async (id) => {
    setActionLoading(id + '-recat');
    const tid = toast.loading('מקטלג מחדש...');
    try {
      const { data } = await api.post(`/api/imports/${id}/recategorize?force=true`);
      toast.success(`עודכנו ${data.updatedCount} • נשארו לא מסווג: ${data.uncategorizedCount}`, { id: tid });
      loadReports();
    } catch (e) { toast.error(e.response?.data?.message || 'שגיאה', { id: tid }); }
    finally { setActionLoading(''); }
  };

  return (
    <div className="page">
      <ConfirmModal
        open={confirmModal.open}
        title="מחיקת batch"
        message="פעולה זו תמחק את הבאץ׳ וכל העסקאות שלו לצמיתות."
        confirmLabel="מחק"
        onConfirm={handleDelete}
        onCancel={() => setConfirmModal({ open: false, batchId: null })}
      />

      {/* Header */}
      <div className="page-header">
        <h1>דשבורד</h1>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>⬆ העלאה</button>
      </div>

      {/* Date filter */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', flexShrink: 0 }}>טווח:</span>
          <input type="date" className="input" style={{ maxWidth: 150, minWidth: 120 }} value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>—</span>
          <input type="date" className="input" style={{ maxWidth: 150, minWidth: 120 }} value={to}   onChange={(e) => setTo(e.target.value)} />
          <button className="btn btn-ghost btn-sm" onClick={loadReports} style={{ flexShrink: 0 }}>רענן</button>
          {(from || to) && <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(''); setTo(''); }} style={{ flexShrink: 0 }}>× נקה</button>}
        </div>
      </div>

      {/* KPI Cards */}
      <SummaryCards {...totals} loading={loading} />

      {/* Chart */}
      <SummaryChart data={summary} />

      {/* Reports grid */}
      <div className="grid-2 stack-mobile" style={{ marginBottom: 24 }}>
        {/* Categories */}
        <div className="card">
          <div className="section-title">פירוט קטגוריות</div>
          {loading ? <div className="loading-full" style={{ minHeight: 120 }}><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>קטגוריה</th><th>סכום</th><th>עסקאות</th></tr></thead>
                <tbody>
                  {summary.map((r) => (
                    <tr key={r.category}>
                      <td><span className="badge badge-gray">{r.category}</span></td>
                      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatAmount(r.totalAmount)}</td>
                      <td className="mono" style={{ color: 'var(--text-3)' }}>{r.txCount}</td>
                    </tr>
                  ))}
                  {!summary.length && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 20 }}>אין נתונים</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top merchants */}
        <div className="card">
          <div className="section-title">בתי עסק מובילים</div>
          {loading ? <div className="loading-full" style={{ minHeight: 120 }}><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>שם עסק</th><th>סכום</th><th>#</th></tr></thead>
                <tbody>
                  {merchants.map((m, i) => (
                    <tr key={m.businessName}>
                      <td className="truncate" style={{ maxWidth: 160 }}>
                        <span className="mono" style={{ color: 'var(--text-3)', fontSize: '0.72rem', marginLeft: 6 }}>#{i+1}</span>
                        {m.businessName}
                      </td>
                      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatAmount(m.totalAmount)}</td>
                      <td className="mono" style={{ color: 'var(--text-3)' }}>{m.txCount}</td>
                    </tr>
                  ))}
                  {!merchants.length && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 20 }}>אין נתונים</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Batches */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>קבצים שהועלו</div>
          <button className="btn btn-ghost btn-sm" onClick={() => loadBatches(page)}>↻</button>
        </div>

        {bLoading ? <div className="loading-full"><div className="spinner" /></div> : (
          <>
            {/* Desktop table */}
            {!mobile ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>קובץ</th><th>סוג</th><th>תאריך</th><th>סטטוס</th><th>פעולות</th></tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b._id}>
                        <td style={{ maxWidth: 180 }} className="truncate">
                          <button onClick={() => navigate(`/batches/${b._id}`)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.82rem', padding: 0 }}>
                            {b.originalFileName}
                          </button>
                        </td>
                        <td><span className="badge badge-gray mono">{b.sourceType.toUpperCase()}</span></td>
                        <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(b.createdAt)}</td>
                        <td>{STATUS_BADGE[b.status] || b.status}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/batches/${b._id}`)}>צפה</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => downloadExport(b._id, 'csv')}>CSV</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => downloadExport(b._id, 'xlsx')}>XLSX</button>
                            <button className="btn btn-ghost btn-sm" disabled={actionLoading === b._id+'-recat'} onClick={() => handleRecategorize(b._id)}>
                              {actionLoading === b._id+'-recat' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '↺'}
                            </button>
                            <button className="btn btn-danger btn-sm" disabled={actionLoading === b._id+'-del'} onClick={() => setConfirmModal({ open: true, batchId: b._id })}>
                              {actionLoading === b._id+'-del' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🗑'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!batches.length && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>
                        עדיין לא הועלו קבצים —{' '}
                        <button onClick={() => navigate('/upload')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--mono)' }}>העלה עכשיו</button>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Mobile cards */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {batches.map((b) => (
                  <div key={b._id} className="batch-card">
                    <div className="batch-card-row">
                      <button onClick={() => navigate(`/batches/${b._id}`)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.82rem', padding: 0, textAlign: 'right', flex: 1 }} className="truncate">
                        {b.originalFileName}
                      </button>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                        <span className="badge badge-gray mono">{b.sourceType.toUpperCase()}</span>
                        {STATUS_BADGE[b.status]}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{formatDate(b.createdAt)}</div>
                    <div className="batch-card-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/batches/${b._id}`)}>צפה</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadExport(b._id, 'csv')}>CSV</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadExport(b._id, 'xlsx')}>XLSX</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRecategorize(b._id)}>↺ קטלג</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmModal({ open: true, batchId: b._id })}>🗑</button>
                    </div>
                  </div>
                ))}
                {!batches.length && (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28, fontFamily: 'var(--mono)' }}>
                    אין קבצים —{' '}
                    <button onClick={() => navigate('/upload')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--mono)' }}>העלה עכשיו</button>
                  </div>
                )}
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ הקודם</button>
                <span>{page} / {pagination.pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>הבא ›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
