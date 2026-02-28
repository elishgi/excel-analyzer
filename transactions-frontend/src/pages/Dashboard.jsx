import { useCallback, useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getBudget, patchBudgetCell, putBudget } from '../api/budgets.js';
import { getMonthlyDashboard } from '../api/dashboard.js';

const GROUP_META = {
  fixedBills: { label: 'חשבונות ומנויים', withDay: true },
  variableExpenses: { label: 'הוצאות משתנות', withDay: false },
  loansCash: { label: 'הלוואות/מזומן', withDay: false },
  tithes: { label: 'מעשרות', withDay: true },
  savings: { label: 'תוכנית חסכון', withDay: false },
  income: { label: 'הכנסות', withDay: false },
};

const BREAKDOWN_ORDER = ['fixedBills', 'variableExpenses', 'loansCash', 'tithes', 'savings', 'income'];

function monthNow() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function currency(amount) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(amount || 0);
}

function sourceBadge(source) {
  if (source === 'manual') return <span className="badge badge-yellow">M</span>;
  if (source === 'auto') return <span className="badge badge-gray">A</span>;
  return <span className="badge badge-gray">-</span>;
}

function buildEmptyBudget(monthKey) {
  return {
    monthKey,
    notes: '',
    targets: { fixedBills: 0, variableExpenses: 0, income: 0, savings: 0, loansCash: 0, tithes: 0 },
    groupItems: { fixedBillsItems: [], variableItems: [], loansCashItems: [], tithesItems: [], savingsItems: [], incomeItems: [] },
    manualCells: [],
  };
}

function EditableNumber({ value, path, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => setEditing(true)}>
        {currency(value)}
      </button>
    );
  }

  return (
    <div className="flex gap-6" style={{ alignItems: 'center' }}>
      <input className="input" type="number" min={0} step="0.01" style={{ width: 120, padding: '4px 8px' }} value={draft ?? 0} onChange={(e) => setDraft(Number(e.target.value))} />
      <button className="btn btn-primary btn-sm" onClick={async () => { await onSave(path, draft); setEditing(false); }}>שמור</button>
      <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(value); setEditing(false); }}>ביטול</button>
      <button className="btn btn-danger btn-sm" onClick={async () => { await onSave(path, null); setEditing(false); }}>נקה</button>
    </div>
  );
}

export default function Dashboard() {
  const [monthKey, setMonthKey] = useState(monthNow);
  const [dashboard, setDashboard] = useState(null);
  const [budgetDraft, setBudgetDraft] = useState(buildEmptyBudget(monthNow()));
  const [activeTab, setActiveTab] = useState('fixedBills');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openEditor, setOpenEditor] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, budgetRes] = await Promise.all([getMonthlyDashboard(monthKey), getBudget(monthKey)]);
      setDashboard(dashRes);
      setBudgetDraft({
        monthKey,
        notes: budgetRes.notes || '',
        targets: budgetRes.targets || buildEmptyBudget(monthKey).targets,
        groupItems: budgetRes.groupItems || buildEmptyBudget(monthKey).groupItems,
        manualCells: budgetRes.manualCells || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בטעינת הדשבורד');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveCell = async (path, value) => {
    try {
      await patchBudgetCell(monthKey, path, value);
      await loadData();
      toast.success('התא עודכן');
    } catch (err) {
      toast.error(err.response?.data?.message || 'עדכון התא נכשל');
    }
  };

  const normalizeForSave = () => ({ ...budgetDraft });

  const onSaveBudget = async () => {
    setSaving(true);
    try {
      await putBudget(monthKey, normalizeForSave());
      toast.success('התכנון נשמר בהצלחה');
      setOpenEditor(false);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'שמירת התכנון נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const emptyMonth = useMemo(
    () => dashboard?.overviewTable?.every((row) => row.actual?.value === 0),
    [dashboard]
  );

  if (loading) return <div className="loading-full"><span className="spinner" /> טוען דשבורד...</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>דשבורד חודשי</h1>
        <div className="flex gap-8 flex-wrap" style={{ alignItems: 'center' }}>
          <input type="month" className="input" style={{ maxWidth: 170 }} value={monthKey} onChange={(e) => setMonthKey(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setOpenEditor(true)}>עריכת תכנון חודש</button>
        </div>
      </div>

      <div className="grid-3 mb-16">
        <div className="card"><div className="section-title">מתוכנן להוצאה</div><h2>{currency(dashboard.kpis.plannedExpenseTotal)}</h2></div>
        <div className="card"><div className="section-title">בוצע</div><h2>{currency(dashboard.kpis.actualExpenseTotal)}</h2></div>
        <div className="card"><div className="section-title">נותר</div><h2>{currency(dashboard.kpis.remainingToSpend)}</h2></div>
      </div>

      {emptyMonth && <div className="alert alert-info">אין נתוני הוצאה/הכנסה לחודש הנבחר.</div>}

      <div className="card mb-16">
        <div className="section-title">Planned vs Actual</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>קטגוריה</th><th>יעד</th><th>תוצאה</th><th>פער</th></tr></thead>
            <tbody>
              {dashboard.overviewTable.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="mono"><div className="flex gap-6" style={{ alignItems: 'center' }}><EditableNumber value={row.target.value} path={`overview.${row.key}.target`} onSave={saveCell} />{sourceBadge(row.target.source)}</div></td>
                  <td className="mono"><div className="flex gap-6" style={{ alignItems: 'center' }}><EditableNumber value={row.actual.value} path={`overview.${row.key}.actual`} onSave={saveCell} />{sourceBadge(row.actual.source)}</div></td>
                  <td className="mono" style={{ color: row.diff > 0 ? 'var(--red)' : 'var(--accent)' }}>{currency(row.diff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-title">פירוט קבוצות</div>
        <div className="flex gap-8 flex-wrap mb-16">
          {BREAKDOWN_ORDER.map((key) => (
            <button key={key} className={`btn btn-sm ${activeTab === key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(key)}>
              {GROUP_META[key].label}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>שם</th><th>יום</th><th>יעד</th><th>תוצאה</th><th>מקור</th><th>פער</th></tr></thead>
            <tbody>
              {(dashboard.groupsBreakdown[activeTab]?.items || []).map((row, idx) => (
                <tr key={`${row.name}-${idx}`}>
                  <td>{row.name}</td>
                  <td className="mono">{row.dayInMonth ?? '-'}</td>
                  <td className="mono"><EditableNumber value={row.target} path={`groups.${activeTab}.items[${idx}].target`} onSave={saveCell} /></td>
                  <td className="mono"><EditableNumber value={row.finalActual} path={`groups.${activeTab}.items[${idx}].actual`} onSave={saveCell} /></td>
                  <td>{sourceBadge(row.manualActual !== null && row.manualActual !== undefined ? 'manual' : (row.autoActual ? 'auto' : 'none'))}</td>
                  <td className="mono" style={{ color: row.diff > 0 ? 'var(--red)' : 'var(--accent)' }}>{currency(row.diff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-16 mono text-muted">
          לא שויך אוטומטית: {currency(dashboard.groupsBreakdown[activeTab]?.unassigned?.autoActual || 0)}
        </div>
      </div>

      {openEditor && (
        <div className="modal-overlay" onClick={() => !saving && setOpenEditor(false)}>
          <div className="modal-content" style={{ width: 'min(680px, 95vw)', maxHeight: '88vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>עריכת תכנון לחודש {monthKey}</h3></div>
            <div className="form-group"><label>הערות</label><textarea className="input" rows={4} value={budgetDraft.notes} onChange={(e) => setBudgetDraft((prev) => ({ ...prev, notes: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="btn btn-ghost" disabled={saving} onClick={() => setOpenEditor(false)}>ביטול</button>
              <button className="btn btn-primary" disabled={saving} onClick={onSaveBudget}>{saving ? 'שומר...' : 'שמירה'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
