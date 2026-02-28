import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatAmount } from '../utils/date.js';

const COLORS = ['#4eff7c','#4eaaff','#ffd84e','#ff4e4e','#b44eff','#ff914e','#4effdf'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, padding: '10px 14px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
        {formatAmount(payload[0].value)}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
        {payload[0].payload.txCount} עסקאות
      </div>
    </div>
  );
};

export default function SummaryChart({ data = [] }) {
  if (!data.length) return null;
  const chartData = data.slice(0, 12).map((d) => ({
    name: d.category || d.month || '—',
    totalAmount: Math.abs(d.totalAmount),
    txCount: d.txCount,
  }));

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="section-title">הוצאות לפי קטגוריה</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 40, left: 16 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--sans)', fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `₪${(v/1000).toFixed(0)}K`}
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="totalAmount" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
