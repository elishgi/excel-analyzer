import { useState, useRef } from 'react';
import api from '../api/axios.js';

export default function UploadForm({ onSuccess }) {
  const [file,       setFile]       = useState(null);
  const [sourceType, setSourceType] = useState('max');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const inputRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.xlsx')) { setError('נא לבחור קובץ .xlsx בלבד'); return; }
    setError('');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { inputRef.current.files = e.dataTransfer.files; handleFile({ target: { files: [f] } }); }
  };

  const handleSubmit = async () => {
    if (!file) return setError('נא לבחור קובץ');
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sourceType', sourceType);
      const { data } = await api.post('/api/imports', fd);
      onSuccess(data);
    } catch (e) {
      setError(e.response?.data?.message || 'שגיאה בהעלאה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${file ? 'var(--accent)' : 'var(--border-2)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: 20,
          transition: 'border-color 0.2s',
          background: file ? 'var(--accent-dim)' : 'transparent',
        }}
      >
        <input ref={inputRef} type="file" accept=".xlsx" hidden onChange={handleFile} />
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>📂</div>
        {file
          ? <><div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{file.name}</div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>{(file.size/1024).toFixed(1)} KB</div></>
          : <><div style={{ color: 'var(--text-2)' }}>גרור קובץ אקסל לכאן</div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>או לחץ לבחירה • .xlsx עד 10MB</div></>
        }
      </div>

      {/* Source type */}
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label>סוג הכרטיס</label>
        <select className="input" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
          <option value="max">MAX</option>
          <option value="visa">Visa / CAL</option>
        </select>
      </div>

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !file} style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }}>
        {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> מעלה...</> : '⬆ העלה קובץ'}
      </button>
    </div>
  );
}
