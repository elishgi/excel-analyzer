import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err,  setErr]  = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (er) {
      const d = er.response?.data;
      setErr(Array.isArray(d?.details) ? d.details.join(' • ') : d?.message || 'שגיאת הרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>
            TRANSACT<span style={{ color: 'var(--text-3)' }}>IL</span>
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 6, fontFamily: 'var(--mono)' }}>יצירת חשבון חדש</div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 22, fontSize: '1.1rem' }}>הרשמה</h2>
          {err && <div className="alert alert-error">{err}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>שם מלא</label>
              <input className="input" value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div className="form-group">
              <label>אימייל</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group" style={{ marginBottom: 22 }}>
              <label>סיסמה (מינימום 6 תווים)</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'יצירת חשבון'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-3)', fontSize: '0.82rem' }}>
          יש לך חשבון?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--mono)' }}>כניסה</Link>
        </div>
      </div>
    </div>
  );
}
