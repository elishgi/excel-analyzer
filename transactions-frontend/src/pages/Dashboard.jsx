import { useCallback, useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getBudget, putBudget } from '../api/budgets.js';
import { getMonthlyDashboard } from '../api/dashboard.js';

const GROUP_META = {
  fixedBills: { label: 'חשבונות ומנויים', withDay: true },
  variableExpenses: { label: 'הוצאות משתנות', withDay: false },
  loansCash: { label: 'הלוואות/מזומן', withDay: false },
  tithes: { label: 'מעשרות', withDay: true },
  savings: { label: 'תוכנית חסכון', withDay: false },
  incomeLines: { label: 'הכנסות', withDay: false },
};

const BREAKDOWN_ORDER = ['fixedBills', 'variableExpenses', 'loansCash', 'tithes', 'savings', 'incomeLines'];

function monthNow() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function currency(amount) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(amount || 0);
}

function buildEmptyBudget(monthKey) {
  return {
    monthKey,
    incomeLines: [],
    groups: { fixedBills: [], variableExpenses: [], loansCash: [], tithes: [], savings: [] },
    notes: '',
  };
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
      const [dashRes, budgetRes] = await Promise.all([
        getMonthlyDashboard(monthKey),
        getBudget(monthKey),
      ]);
      setDashboard(dashRes);
      setBudgetDraft({
        monthKey,
        incomeLines: budgetRes.incomeLines || [],
        groups: {
          fixedBills: budgetRes.groups?.fixedBills || [],
          variableExpenses: budgetRes.groups?.variableExpenses || [],
          loansCash: budgetRes.groups?.loansCash || [],
          tithes: budgetRes.groups?.tithes || [],
          savings: budgetRes.groups?.savings || [],
        },
        notes: budgetRes.notes || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'שגיאה בטעינת הדשבורד');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const emptyMonth = useMemo(
    () => dashboard?.charts?.spendByDay?.length === 0,
    [dashboard]
  );

  const updateLine = (groupKey, index, field, value) => {
    setBudgetDraft((prev) => {
      const next = structuredClone(prev);
      const targetArray = groupKey === 'incomeLines' ? next.incomeLines : next.groups[groupKey];
      targetArray[index][field] = field === 'targetAmount' || field === 'dayInMonth'
        ? (value === '' ? '' : Number(value))
        : value;
      return next;
    });
  };

  const addLine = (groupKey) => {
    setBudgetDraft((prev) => {
      const next = structuredClone(prev);
      const arr = groupKey === 'incomeLines' ? next.incomeLines : next.groups[groupKey];
      arr.push({ name: '', targetAmount: 0, ...(GROUP_META[groupKey].withDay ? { dayInMonth: '' } : {}) });
      return next;
    });
  };

  const deleteLine = (groupKey, index) => {
    setBudgetDraft((prev) => {
      const next = structuredClone(prev);
      const arr = groupKey === 'incomeLines' ? next.incomeLines : next.groups[groupKey];
      arr.splice(index, 1);
      return next;
    });
  };

  const normalizeForSave = () => ({
    incomeLines: budgetDraft.incomeLines
      .filter((l) => l.name?.trim())
      .map((l) => ({ name: l.name.trim(), targetAmount: Number(l.targetAmount) || 0 })),
    groups: {
      fixedBills: budgetDraft.groups.fixedBills
        .filter((l) => l.name?.trim())
        .map((l) => ({ name: l.name.trim(), targetAmount: Number(l.targetAmount) || 0, ...(l.dayInMonth ? { dayInMonth: Number(l.dayInMonth) } : {}) })),
      variableExpenses: budgetDraft.groups.variableExpenses
        .filter((l) => l.name?.trim())
        .map((l) => ({ name: l.name.trim(), targetAmount: Number(l.targetAmount) || 0 })),
      loansCash: budgetDraft.groups.loansCash
        .filter((l) => l.name?.trim())
        .map((l) => ({ name: l.name.trim(), targetAmount: Number(l.targetAmount) || 0 })),
      tithes: budgetDraft.groups.tithes
        .filter((l) => l.name?.trim())
        .map((l) => ({ name: l.name.trim(), targetAmount: Number(l.targetAmount) || 0, ...(l.dayInMonth ? { dayInMonth: Number(l.dayInMonth) } : {}) })),
      savings: budgetDraft.groups.savings
        .filter((l) => l.name?.trim())
        .map((l) => ({ name: l.name.trim(), targetAmount: Number(l.targetAmount) || 0 })),
    },
    notes: budgetDraft.notes || '',
  });

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

  if (loading) {
    return <div className="loading-full"><span className="spinner" /> טוען דשבורד...</div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

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
        <div className="card">
          <div className="section-title">נותר</div>
          <h2>{currency(dashboard.kpis.remainingToSpend)}</h2>
          <span className={`badge ${dashboard.kpis.isWithinBudget ? 'badge-green' : 'badge-red'}`}>
            {dashboard.kpis.isWithinBudget ? '✅ בתקציב' : '❌ חריגה'}
          </span>
        </div>
      </div>

      {emptyMonth && <div className="alert alert-info">אין עסקאות בחודש הנבחר.</div>}

      <div className="card mb-16">
        <div className="section-title">Planned vs Actual</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>קטגוריה</th><th>יעד</th><th>תוצאה</th><th>פער</th></tr></thead>
            <tbody>
              {dashboard.overviewTable.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="mono">{currency(row.target)}</td>
                  <td className="mono">{currency(row.actual)}</td>
                  <td className="mono" style={{ color: row.diff > 0 ? 'var(--red)' : 'var(--accent)' }}>{currency(row.diff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-16">
        <div className="section-title">חלוקת הוצאות בפועל לפי קבוצות</div>
        <div className="grid-2">
          {dashboard.charts.expenseSplitByGroup.map((item) => (
            <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="flex" style={{ justifyContent: 'space-between' }}>
                <span>{item.label}</span>
                <span className="mono">{currency(item.value)}</span>
              </div>
              <div style={{ width: '100%', height: 10, borderRadius: 6, background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                <div style={{ width: `${Math.min(100, dashboard.kpis.actualExpenseTotal ? (item.value / dashboard.kpis.actualExpenseTotal) * 100 : 0)}%`, height: '100%', background: 'var(--accent)', borderRadius: 6 }} />
              </div>
            </div>
          ))}
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
            <thead><tr><th>שם</th><th>יום</th><th>יעד</th><th>תוצאה</th><th>פער</th></tr></thead>
            <tbody>
              {(dashboard.groupsBreakdown[activeTab] || []).map((row, idx) => (
                <tr key={`${row.name}-${idx}`}>
                  <td>{row.name}</td>
                  <td className="mono">{row.dayInMonth ?? '-'}</td>
                  <td className="mono">{currency(row.target)}</td>
                  <td className="mono">{currency(row.actual)}</td>
                  <td className="mono" style={{ color: row.diff > 0 ? 'var(--red)' : 'var(--accent)' }}>{currency(row.diff)}</td>
                </tr>
              ))}
              {(dashboard.groupsBreakdown[activeTab] || []).length === 0 && (
                <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center' }}>אין שורות בקבוצה זו</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-16 mono text-muted">
          לא שויך: {currency(dashboard.groupsBreakdown.unassignedByGroup?.[activeTab === 'incomeLines' ? 'income' : activeTab] || 0)}
        </div>
      </div>

      {openEditor && (
        <div className="modal-overlay" onClick={() => !saving && setOpenEditor(false)}>
          <div className="modal-content" style={{ width: 'min(1000px, 95vw)', maxHeight: '88vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>עריכת תכנון לחודש {monthKey}</h3></div>

            {BREAKDOWN_ORDER.map((key) => {
              const rows = key === 'incomeLines' ? budgetDraft.incomeLines : budgetDraft.groups[key];
              return (
                <div key={key} className="card" style={{ marginBottom: 12, padding: '12px 14px' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>{GROUP_META[key].label}</strong>
                    <button className="btn btn-ghost btn-sm" onClick={() => addLine(key)}>+ הוספת שורה</button>
                  </div>
                  {rows.map((line, index) => (
                    <div key={`${key}-${index}`} className="grid-4" style={{ marginBottom: 8 }}>
                      <input className="input" placeholder="שם" value={line.name || ''} onChange={(e) => updateLine(key, index, 'name', e.target.value)} />
                      {GROUP_META[key].withDay ? (
                        <input className="input" type="number" placeholder="יום בחודש" min={1} max={31} value={line.dayInMonth ?? ''} onChange={(e) => updateLine(key, index, 'dayInMonth', e.target.value)} />
                      ) : <input className="input" disabled value="-" />}
                      <input className="input" type="number" min={0} step="0.01" placeholder="יעד" value={line.targetAmount ?? 0} onChange={(e) => updateLine(key, index, 'targetAmount', e.target.value)} />
                      <button className="btn btn-danger" onClick={() => deleteLine(key, index)}>מחיקה</button>
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="form-group">
              <label>הערות</label>
              <textarea className="input" rows={4} value={budgetDraft.notes} onChange={(e) => setBudgetDraft((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>

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
