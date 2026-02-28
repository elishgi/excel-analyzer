import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import RuleFormModal from '../components/RuleFormModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { formatDate } from '../utils/date.js';

const TYPE_BADGE = {
  exact:    <span className="badge badge-green">exact</span>,
  contains: <span className="badge badge-yellow">contains</span>,
  regex:    <span className="badge badge-gray">regex</span>,
};

export default function Dictionary() {
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [modal,    setModal]    = useState(null);
  const [deleting, setDeleting] = useState('');
  const [search,   setSearch]   = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, ruleId: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/dictionary');
      setRules(data || []);
    } catch (e) { toast.error(e.response?.data?.message || 'שגיאה בטעינה'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/api/dictionary', form);
        toast.success('החוק נוסף בהצלחה');
      } else {
        await api.put(`/api/dictionary/${modal._id}`, form);
        toast.success('החוק עודכן בהצלחה');
      }
      setModal(null); load();
    } catch (e) {
      const d = e.response?.data;
      toast.error(Array.isArray(d?.details) ? d.details.join(' • ') : d?.message || 'שגיאה');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    const id = confirmModal.ruleId;
    setConfirmModal({ open: false, ruleId: null });
    setDeleting(id);
    try {
      await api.delete(`/api/dictionary/${id}`);
      setRules((r) => r.filter((x) => x._id !== id));
      toast.success('החוק נמחק');
    } catch (e) { toast.error(e.response?.data?.message || 'שגיאה'); }
    finally { setDeleting(''); }
  };

  const filtered = rules
    .filter((r) => !search || r.pattern.includes(search) || r.category.includes(search))
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="page">
      <ConfirmModal open={confirmModal.open} title="מחיקת חוק" message="האם למחוק את החוק הזה מהמילון?" confirmLabel="מחק" onConfirm={handleDelete} onCancel={() => setConfirmModal({ open: false, ruleId: null })} />

      <div className="page-header">
        <div>
          <h1>מילון קיטלוג</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 3 }}>{rules.length} חוקים פעילים</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')} style={{ flexShrink: 0 }}>+ הוסף</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="חיפוש לפי תבנית או קטגוריה..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-full"><div className="spinner" /><span>טוען...</span></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>עדיפות</th><th>סוג</th><th>תבנית</th><th>קטגוריה</th><th>נוצר</th><th>פעולות</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{r.priority}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{TYPE_BADGE[r.matchType]}</td>
                    <td className="mono truncate" style={{ color: 'var(--text)', maxWidth: 180 }}>{r.pattern}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><span className="badge badge-gray">{r.category}</span></td>
                    <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(r)}>עריכה</button>
                        <button className="btn btn-danger btn-sm" disabled={deleting === r._id} onClick={() => setConfirmModal({ open: true, ruleId: r._id })}>
                          {deleting === r._id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'מחק'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>
                    {search ? 'אין תוצאות' : 'אין חוקים — הוסף את הראשון!'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <RuleFormModal rule={modal === 'add' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} loading={saving} />}
    </div>
  );
}
