export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = 'אשר', danger = true }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: '50%',
            background: danger ? 'var(--red-dim)' : 'var(--accent-dim)',
            fontSize: '1.3rem',
          }}>
            {danger ? '🗑' : '?'}
          </div>
        </div>

        <h3 style={{ textAlign: 'center', marginBottom: 10, fontSize: '1rem' }}>{title}</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.87rem', lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" style={{ minWidth: 90 }} onClick={onCancel}>
            ביטול
          </button>
          <button
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            style={{ minWidth: 90 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
