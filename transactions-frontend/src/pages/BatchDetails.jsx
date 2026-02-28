import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import TransactionsTable from '../components/TransactionsTable.jsx';
import { downloadExport } from '../utils/download.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function BatchDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [txs,        setTxs]        = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page,       setPage]       = useState(1);
  const [category,   setCat]        = useState('');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    try {
      const params = { page: p, limit: 50 };
      if (category) params.category = category;
      const { data } = await api.get(`/api/imports/${id}/transactions`, { params });
      setTxs(data.data || []);
      setPagination(data.pagination);
    } catch (e) { setError(e.response?.data?.message || 'שגיאה בטעינה'); }
    finally { setLoading(false); }
  }, [id, category]);

  useEffect(() => { load(page); }, [load, page]);

  const handleDownloadUnauthorized = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);


  const handleRecategorize = async () => {
    const tid = toast.loading('מקטלג מחדש...');
    try {
      const { data } = await api.post(`/api/imports/${id}/recategorize?force=true`);
      toast.success(`עודכנו ${data.updatedCount} עסקאות`, { id: tid });
      load(1);
    } catch (e) { toast.error(e.response?.data?.message || 'שגיאה', { id: tid }); }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ flexShrink: 0 }}>← חזרה</button>
          <h1 style={{ fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>עסקאות</h1>
          {pagination.total > 0 && <span className="badge badge-gray mono" style={{ flexShrink: 0 }}>{pagination.total}</span>}
        </div>
        {/* Action buttons — wrap on mobile */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleRecategorize}>↺ קטלג</button>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadExport(id, 'csv', { onUnauthorized: handleDownloadUnauthorized })}>CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => downloadExport(id, 'xlsx', { onUnauthorized: handleDownloadUnauthorized })}>XLSX</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter */}
      <div className="card" style={{ padding: '11px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0 }}>קטגוריה:</span>
          <input className="input" style={{ maxWidth: 200, minWidth: 120 }} placeholder="סנן..." value={category} onChange={(e) => { setCat(e.target.value); setPage(1); }} />
          {category && <button className="btn btn-ghost btn-sm" onClick={() => { setCat(''); setPage(1); }}>× נקה</button>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <TransactionsTable
          transactions={txs}
          loading={loading}
          pagination={{ ...pagination, page }}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
