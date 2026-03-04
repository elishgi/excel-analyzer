import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { closeDashboardMonth, getMonthlyDashboard, patchDashboardCell } from '../api/dashboard.js';

const BOX_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

const monthNow = () => new Date().toISOString().slice(0, 7);
const money = (v) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(v || 0);

export default function Dashboard() {
  const [monthKey, setMonthKey] = useState(monthNow());
  const [data, setData] = useState(null);
  const [closeSummary, setCloseSummary] = useState(null);

  const isCurrent = monthKey === monthNow();
  const readOnly = !isCurrent || data?.locked;

  const load = async () => setData(await getMonthlyDashboard(monthKey));
  useEffect(() => { load(); }, [monthKey]);

  const upsertManual = async (boxKey) => {
    const name = window.prompt('שם שורה'); if (!name) return;
    const target = Number(window.prompt('יעד', '0') || 0);
    const actual = Number(window.prompt('תוצאה', '0') || 0);
    const saveAsTemplate = window.confirm('לשמור לחודשים הבאים?');
    await patchDashboardCell({ monthKey, type: 'manualRowAdd', boxKey, name, target, actual, saveAsTemplate });
    await load();
  };

  const exportOverlay = async (asPdf = false) => {
    if (asPdf) { window.print(); return; }
    const blob = new Blob([JSON.stringify(closeSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `close-summary-${monthKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return <div className="page">טוען...</div>;

  return (
    <div className="page">
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>סטטוס חשבון חודשי</h1>
        <div className="flex gap-8">
          <input className="input" type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} />
          {isCurrent && !data.locked && <button className="btn btn-primary" onClick={async () => { const s = await closeDashboardMonth(monthKey); setCloseSummary(s); await load(); }}>סגירת חודש</button>}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">הכנסות בפועל: <b>{money(data.summary.incomeActual)}</b></div>
        <div className="card">הוצאות בפועל: <b>{money(data.summary.expensesActual)}</b></div>
        <div className="card">יתרה: <b>{money(data.summary.balance)}</b></div>
      </div>

      {readOnly && <div className="alert">מצב צפייה בלבד {data.locked ? '(חודש סגור)' : '(לא חודש נוכחי)'}</div>}

      {data.boxes.map((box) => (
        <div className="card" key={box.boxKey} style={{ marginTop: 12 }}>
          <div className="flex" style={{ justifyContent: 'space-between' }}><h3>{box.title}</h3>{!readOnly && <button className="btn btn-ghost" onClick={() => upsertManual(box.boxKey)}>+ הוספת שורה ידנית</button>}</div>
          <table className="table">
            <thead><tr><th>שם</th><th>יעד</th><th>תוצאה</th><th>פעולות</th></tr></thead>
            <tbody>
              {box.autoRows.map((r) => <Row key={String(r.categoryId)} row={r} readOnly={readOnly} onSave={async (target) => { await patchDashboardCell({ monthKey, type: 'categoryTarget', categoryId: String(r.categoryId), target }); await load(); }} />)}
              {box.manualRows.map((r) => <Row key={String(r.id)} row={r} readOnly={readOnly} manual onSave={async (target, actual, name) => { await patchDashboardCell({ monthKey, type: 'manualRowUpdate', boxKey: box.boxKey, rowId: String(r.id), target, actual, name }); await load(); }} onDelete={async () => { const removeTemplateFuture = window.confirm('למחוק גם לחודשים הבאים?'); await patchDashboardCell({ monthKey, type: 'manualRowDelete', boxKey: box.boxKey, rowId: String(r.id), removeTemplateFuture }); await load(); }} />)}
            </tbody>
            <tfoot><tr><td>סה"כ</td><td>{money(box.totals.target)}</td><td>{money(box.totals.actual)}</td><td>{money(box.totals.diff)}</td></tr></tfoot>
          </table>
        </div>
      ))}

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card" style={{ height: 280 }}><ResponsiveContainer><PieChart><Pie data={data.charts.pie} dataKey="value" nameKey="name">{data.charts.pie.map((_, i) => <Cell key={i} fill={BOX_COLORS[i % BOX_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        <div className="card">נותר: <b>{money(data.charts.donut.remaining)}</b></div>
      </div>
      <div className="card" style={{ marginTop: 12, height: 300 }}>
        <ResponsiveContainer><LineChart data={data.charts.line}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line dataKey="planned" stroke="#3b82f6" /><Line dataKey="actual" stroke="#ef4444" /></LineChart></ResponsiveContainer>
      </div>

      {closeSummary && (
        <div className="modal-backdrop" onClick={() => setCloseSummary(null)}>
          <div id="close-summary-overlay" className="card" style={{ maxWidth: 640, margin: '10vh auto', background: '#111827' }} onClick={(e) => e.stopPropagation()}>
            <h2>🎉 סיכום סגירת חודש</h2>
            <p>הכנסות: {money(closeSummary.summary.incomeActual)}</p>
            <p>הוצאות: {money(closeSummary.summary.expensesActual)}</p>
            <p>יתרה: {money(closeSummary.summary.balance)}</p>
            <p>עמידה ביעדים: {closeSummary.achievement.metRows}/{closeSummary.achievement.totalRows} ({closeSummary.achievement.percent}%)</p>
            <p>קטגוריה כבדה: {closeSummary.heaviestCategory}</p>
            <div className="flex gap-8"><button className="btn" onClick={() => exportOverlay(false)}>Download PNG</button><button className="btn" onClick={() => exportOverlay(true)}>Download PDF</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ row, readOnly, manual = false, onSave, onDelete }) {
  const [name, setName] = useState(row.name);
  const [target, setTarget] = useState(row.target || 0);
  const [actual, setActual] = useState(row.actual || 0);
  useEffect(() => { setName(row.name); setTarget(row.target || 0); setActual(row.actual || 0); }, [row]);
  return <tr>
    <td>{manual && !readOnly ? <input className="input" value={name} onChange={(e) => setName(e.target.value)} /> : row.name}</td>
    <td>{readOnly ? money(target) : <input className="input" type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />}</td>
    <td>{manual && !readOnly ? <input className="input" type="number" value={actual} onChange={(e) => setActual(Number(e.target.value))} /> : money(actual)}</td>
    <td>{!readOnly && <><button className="btn btn-ghost" onClick={() => onSave(target, actual, name)}>שמור</button>{manual && <button className="btn btn-danger" onClick={onDelete}>מחק</button>}</>}</td>
  </tr>;
}
