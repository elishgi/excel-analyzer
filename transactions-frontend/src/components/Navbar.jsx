import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const links = [
  { to: '/dashboard',    label: 'דשבורד',  icon: '◈' },
  { to: '/upload',       label: 'העלאה',   icon: '⬆' },
  { to: '/uncategorized',label: 'חריגים',  icon: '⚑' },
  { to: '/dictionary',   label: 'מילון',   icon: '≡' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const linkStyle = (isActive) => ({
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--mono)',
    fontSize: '0.78rem',
    fontWeight: 500,
    textDecoration: 'none',
    color: isActive ? 'var(--accent)' : 'var(--text-3)',
    background: isActive ? 'var(--accent-dim)' : 'transparent',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  });

  return (
    <>
      <nav style={{
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        height: 'var(--nav-h)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Logo */}
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent)', flexShrink: 0 }}>
          TRANSACT<span style={{ color: 'var(--text-3)' }}>IL</span>
        </span>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: 2 }} className="desktop-nav">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => linkStyle(isActive)}>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Desktop right: user + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="desktop-nav">
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.74rem', color: 'var(--text-3)' }}>
            {user?.name}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>יציאה</button>
        </div>

        {/* Mobile: hamburger */}
        <button
          className="btn btn-ghost btn-icon mobile-nav"
          onClick={() => setOpen(true)}
          aria-label="פתח תפריט"
          style={{ fontSize: '1.1rem' }}
        >
          ☰
        </button>
      </nav>

      {/* Drawer overlay */}
      {open && (
        <>
          <div className="drawer-overlay" onClick={() => setOpen(false)} />
          <div className="drawer">
            {/* Drawer header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>
                TRANSACT<span style={{ color: 'var(--text-3)' }}>IL</span>
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)} style={{ fontSize: '1rem' }}>✕</button>
            </div>

            {/* User */}
            <div style={{ padding: '0 20px 14px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--mono)', marginBottom: 2 }}>מחובר כ:</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</div>
            </div>

            {/* Nav links */}
            <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {links.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} style={({ isActive }) => ({
                  ...linkStyle(isActive),
                  padding: '11px 14px',
                  fontSize: '0.9rem',
                  borderRadius: 'var(--radius)',
                })}>
                  <span style={{ width: 20, textAlign: 'center', fontSize: '0.85rem' }}>{icon}</span>
                  {label}
                </NavLink>
              ))}
            </div>

            {/* Logout */}
            <div style={{ padding: '16px 12px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
                יציאה
              </button>
            </div>
          </div>
        </>
      )}

      {/* CSS for desktop/mobile visibility */}
      <style>{`
        .desktop-nav { display: flex; }
        .mobile-nav  { display: none; }
        @media (max-width: 680px) {
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: flex !important; }
        }
      `}</style>
    </>
  );
}
