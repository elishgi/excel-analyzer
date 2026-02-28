import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { formatDate, formatAmount } from '../utils/date.js';

const CATEGORIES = [
  'סופרמרקט','מסעדות','קפה ומאפייה','דלק','רכב','בגדים','בריאות ויופי',
  'ספורט','בידור','נסיעות','חשמל ואלקטרוניקה','ביטוח','חינוך','בית ומשק',
  'קניות אונליין','תקשורת','אחר',
];

const isMobile = () => window.innerWidth <= 680;

export default function Uncategorized() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importBatchId = searchParams.get('importBatchId');

  const [txs,        setTxs]        = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState({});
  const [selections, setSelections] = useState({});
  const [doneCount,  setDoneCount]  = useState(0);
  const [mobile,     setMobile]     = useState(isMobile());

  useEffect(() => {
    const h = () => setMobile(isMobile());
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (importBatchId) params.importBatchId = importBatchId;
      const { data } = await api.get('/api/transactions/uncategorized', { params });
      setTxs(data.data || []);
      setPagination(data.pagination);
    } finally { setLoading(false); }
  }, [importBatchId]);

  useEffect(() => { load(page); }, [load, page]);

  const setSel = (id, key, val) =>
    setSelections((s) => ({ ...s, [id]: { save: true, ...s[id], [key]: val } }));

  const handleSave = async (tx) => {
    const sel = selections[tx._id] || {};
    if (!sel.category) { toast.error('נא לבחור קטגוריה'); return; }
    setSaving((s) => ({ ...s, [tx._id]: true }));
    try {
      await api.patch(`/api/transactions/${tx._id}/categorize`, {
        category: sel.category,
        saveToDictionary: sel.save !== false,
        matchType: 'exact',
        pattern: tx.businessName,
        priority: 100,
      });
      setTxs((prev) => prev.filter((t) => t._id !== tx._id));
      setDoneCount((c) => c + 1);
      toast.success(`סווג: ${sel.category}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'שגיאה בשמירה');
    } finally {
      setSaving((s) => { const n = { ...s }; delete n[tx._id]; return n; });
    }
  };

  const handleFinish = async () => {
    if (importBatchId) {
      try { await api.post(`/api/imports/${importBatchId}/recategorize`); } catch {}
    }
    navigate('/dashboard');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>חריגים לסיווג</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 3 }}>
            {pagination.total} נשארו • {doneCount} טופלו
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleFinish} style={{ flexShrink: 0 }}>✓ סיימתי</button>
      </div>

      {loading ? (
        <div className="loading-full"><div className="spinner" /><span>טוען...</span></div>
      ) : !txs.length ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '1.1rem' }}>אין עסקאות לא מסווגות!</div>
          <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => navigate('/dashboard')}>חזרה לדשבורד</button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {txs.map((tx, i) => {
              const sel = selections[tx._id] || { save: true };

              // ── Mobile layout ──────────────────────────────────────────────
              if (mobile) {
                return (
                  <div key={tx._id} className="uncat-row-mobile">
                    {/* Top row: business + amount */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{tx.businessName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{formatDate(tx.date)}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                        {formatAmount(tx.amount)}
                      </div>
                    </div>

                    {/* Category select */}
                    <select
                      className="input"
                      value={sel.category || ''}
                      onChange={(e) => setSel(tx._id, 'category', e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      <option value="">— בחר קטגוריה —</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Bottom row: checkbox + save button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-3)', userSelect: 'none' }}>
                        <input type="checkbox" checked={sel.save !== false} onChange={(e) => setSel(tx._id, 'save', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                        שמור למילון
                      </label>
                      <button
                        className="btn btn-primary"
                        disabled={!sel.category || saving[tx._id]}
                        onClick={() => handleSave(tx)}
                        style={{ minWidth: 80 }}
                      >
                        {saving[tx._id] ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'שמור'}
                      </button>
                    </div>
                  </div>
                );
              }

              // ── Desktop layout ─────────────────────────────────────────────
              return (
                <div key={tx._id} style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 110px 200px 120px 90px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 18px',
                  borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span className="mono" style={{ color: 'var(--text-3)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</span>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.businessName}</span>
                  <span className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatAmount(tx.amount)}</span>
                  <select className="input" style={{ fontSize: '0.82rem', padding: '7px 10px' }} value={sel.category || ''} onChange={(e) => setSel(tx._id, 'category', e.target.value)}>
                    <option value="">— בחר קטגוריה —</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-3)', userSelect: 'none' }}>
                    <input type="checkbox" checked={sel.save !== false} onChange={(e) => setSel(tx._id, 'save', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                    שמור למילון
                  </label>
                  <button className="btn btn-primary btn-sm" disabled={!sel.category || saving[tx._id]} onClick={() => handleSave(tx)} style={{ justifyContent: 'center' }}>
                    {saving[tx._id] ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'שמור'}
                  </button>
                </div>
              );
            })}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination mt-16">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span>{page} / {pagination.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
