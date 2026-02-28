import { useState, useEffect } from 'react';

const EMPTY = { matchType: 'exact', pattern: '', category: '', priority: 10 };

export default function RuleFormModal({ rule, onSave, onClose, loading }) {
  const [form, setForm] = useState(EMPTY);
  const [err,  setErr]  = useState('');

  useEffect(() => {
    setForm(rule ? { matchType: rule.matchType, pattern: rule.pattern, category: rule.category, priority: rule.priority } : EMPTY);
    setErr('');
  }, [rule]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.pattern.trim()) return setErr('pattern הוא שדה חובה');
    if (!form.category.trim()) return setErr('קטגוריה היא שדה חובה');
    if (!Number.isFinite(+form.priority)) return setErr('עדיפות חייבת להיות מספר');
    onSave({ ...form, priority: +form.priority });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{rule ? 'עריכת חוק' : 'הוספת חוק חדש'}</h3>

        {err && <div className="alert alert-error">{err}</div>}

        <div className="form-group">
          <label>סוג התאמה</label>
          <select className="input" value={form.matchType} onChange={(e) => set('matchType', e.target.value)}>
            <option value="exact">exact – זהה בדיוק</option>
            <option value="contains">contains – מכיל</option>
            <option value="regex">regex – ביטוי רגולרי</option>
          </select>
        </div>

        <div className="form-group">
          <label>תבנית (pattern)</label>
          <input className="input" placeholder="לדוגמה: סופר פארם" value={form.pattern} onChange={(e) => set('pattern', e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>קטגוריה</label>
            <input className="input" placeholder="לדוגמה: סופרמרקט" value={form.category} onChange={(e) => set('category', e.target.value)} />
          </div>
          <div className="form-group">
            <label>עדיפות</label>
            <input className="input" type="number" value={form.priority} onChange={(e) => set('priority', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {rule ? 'שמור' : 'הוסף'}
          </button>
        </div>
      </div>
    </div>
  );
}
