import { useCallback, useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getBudget, patchBudgetCell, putBudget } from '../api/budgets.js';
import { getMonthlyDashboard } from '../api/dashboard.js';

const GROUP_CONFIG = {
  income: { label: 'הכנסות', itemKey: 'incomeItems', withDay: false, autoFilled: false, manualOnly: true },
  fixedBills: { label: 'חשבונות ומנויים', itemKey: 'fixedBillsItems', withDay: true, autoFilled: true, manualOnly: false },
  variableExpenses: { label: 'הוצאות משתנות', itemKey: 'variableItems', withDay: false, autoFilled: true, manualOnly: false },
  tithes: { label: 'מעשרות', itemKey: 'tithesItems', withDay: true, autoFilled: true, manualOnly: false },
  savings: { label: 'תכנית חסכון', itemKey: 'savingsItems', withDay: false, autoFilled: false, manualOnly: true },
  loansCash: { label: 'הוצאות ידני', itemKey: 'loansCashItems', withDay: false, autoFilled: false, manualOnly: true },
};

const BREAKDOWN_ORDER = ['income', 'fixedBills', 'variableExpenses', 'tithes', 'savings', 'loansCash'];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const addRow = (groupKey) => {
    const cfg = GROUP_CONFIG[groupKey];
    const nextRow = { name: '', targetAmount: 0, manualActual: 0 };
    if (cfg.withDay) nextRow.dayInMonth = '';
    setBudgetDraft((prev) => ({
      ...prev,
      groupItems: {
        ...prev.groupItems,
        [cfg.itemKey]: [...(prev.groupItems?.[cfg.itemKey] || []), nextRow],
      },
    }));
  };

  const updateRow = (groupKey, idx, field, value) => {
    const cfg = GROUP_CONFIG[groupKey];
    setBudgetDraft((prev) => {
      const rows = [...(prev.groupItems?.[cfg.itemKey] || [])];
      rows[idx] = { ...rows[idx], [field]: value };
      return {
        ...prev,
        groupItems: {
          ...prev.groupItems,
          [cfg.itemKey]: rows,
        },
      };
    });
  };

  const removeRow = (groupKey, idx) => {
    const cfg = GROUP_CONFIG[groupKey];
    setBudgetDraft((prev) => ({
      ...prev,
      groupItems: {
        ...prev.groupItems,
        [cfg.itemKey]: (prev.groupItems?.[cfg.itemKey] || []).filter((_, rowIdx) => rowIdx !== idx),
      },
    }));
  };

  const onSaveBudget = async () => {
    setSaving(true);
    try {
      await putBudget(monthKey, { ...budgetDraft });
      toast.success('הקוביות נשמרו בהצלחה');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'שמירת הקוביות נכשלה');
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
          <button className="btn btn-primary" onClick={onSaveBudget} disabled={saving}>{saving ? 'שומר...' : 'שמירת קוביות'}</button>
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

      <div className="cube-grid">
        {BREAKDOWN_ORDER.map((groupKey) => {
          const cfg = GROUP_CONFIG[groupKey];
          const rows = budgetDraft.groupItems?.[cfg.itemKey] || [];
          const autoRows = dashboard.groupsBreakdown[groupKey]?.items || [];
          const autoTotal = dashboard.groupsBreakdown[groupKey]?.totals?.autoActual || 0;

          return (
            <div className="card cube-card" key={groupKey}>
              <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3>{cfg.label}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => addRow(groupKey)}>+ שורה</button>
              </div>

              {cfg.autoFilled && (
                <div className="alert alert-info" style={{ marginBottom: 10 }}>
                  אוטומטי מסריקת אקסל: {currency(autoTotal)}
                </div>
              )}

              <div className="cube-rows">
                {rows.map((row, idx) => {
                  const autoRow = autoRows[idx];
                  return (
                    <div key={`${groupKey}-${idx}`} className="cube-row">
                      <input
                        className="input"
                        placeholder="שם"
                        value={row.name || ''}
                        onChange={(e) => updateRow(groupKey, idx, 'name', e.target.value)}
                      />
                      {cfg.withDay && (
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={31}
                          placeholder="תאריך"
                          value={row.dayInMonth ?? ''}
                          onChange={(e) => updateRow(groupKey, idx, 'dayInMonth', e.target.value)}
                        />
                      )}
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="יעד"
                        value={row.targetAmount ?? 0}
                        onChange={(e) => updateRow(groupKey, idx, 'targetAmount', Number(e.target.value))}
                      />
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="תוצאה"
                        value={row.manualActual ?? 0}
                        onChange={(e) => updateRow(groupKey, idx, 'manualActual', Number(e.target.value))}
                      />
                      <button className="btn btn-danger btn-icon" onClick={() => removeRow(groupKey, idx)}>✕</button>

                      {cfg.autoFilled && (
                        <div className="mono text-muted" style={{ gridColumn: '1 / -1', fontSize: '0.78rem' }}>
                          זוהה אוטומטית: {currency(autoRow?.autoActual || 0)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!rows.length && <div className="text-muted">אין שורות עדיין. הוסף שורה חדשה.</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
