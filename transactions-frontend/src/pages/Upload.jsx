import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { approveImportDraft, createImportDraft, patchImportDraftRow } from '../api/importDrafts.js';
import { getCategories } from '../api/categories.js';

export default function Upload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [sourceType, setSourceType] = useState('max');
  const [draft, setDraft] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');

  const loadCategories = async () => setCategories(await getCategories());

  const createDraft = async () => {
    const d = await createImportDraft(files, files.map(() => sourceType));
    setDraft(d);
    await loadCategories();
  };

  const filteredRows = (draft?.rows || []).filter((r) => r.merchantName.toLowerCase().includes(search.toLowerCase()));
  const canApprove = (draft?.rows || []).filter((r) => !r.ignored).every((r) => r.categoryId && r.boxKey);

  return <div className="page">
    <h1>העלאת קבצים לטיוטה</h1>
    {!draft && <div className="card">
      <input type="file" multiple accept=".xlsx" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
      <select className="input" value={sourceType} onChange={(e) => setSourceType(e.target.value)}><option value="max">MAX</option><option value="visa">Visa</option></select>
      <button className="btn btn-primary" onClick={createDraft} disabled={!files.length}>צור תצוגה מקדימה</button>
    </div>}

    {draft && <div className="card">
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <input className="input" placeholder="חיפוש בית עסק" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-primary" disabled={!canApprove} onClick={async () => { const res = await approveImportDraft(draft._id); navigate('/dashboard'); }}>אישור ושמירה</button>
      </div>
      <table className="table"><thead><tr><th>date</th><th>merchantName</th><th>amount</th><th>last4</th><th>sourceType</th><th>category</th><th>boxKey</th><th>flags</th><th>ignored</th></tr></thead>
      <tbody>{filteredRows.map((row) => <tr key={row._id}><td>{new Date(row.date).toLocaleDateString('he-IL')}</td><td>{row.merchantName}</td>
      <td><input className="input" type="number" value={row.amount} onChange={async (e) => { const n = Number(e.target.value); const d = await patchImportDraftRow(draft._id, { rowId: row._id, amount: n }); setDraft(d); }} /></td>
      <td>{row.last4}</td><td>{row.sourceType}</td>
      <td><select className="input" value={row.categoryId || ''} onChange={async (e) => { const applyAlways = window.confirm('להחיל לתמיד? (בטל=רק הפעם)'); const d = await patchImportDraftRow(draft._id, { rowId: row._id, categoryId: e.target.value, applyAlways }); setDraft(d); }}><option value="">בחר</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></td>
      <td>{row.boxKey || '-'}</td><td>{(row.flags || []).join(', ')}</td>
      <td><input type="checkbox" checked={!!row.ignored} onChange={async (e) => { const d = await patchImportDraftRow(draft._id, { rowId: row._id, ignored: e.target.checked }); setDraft(d); }} /></td>
      </tr>)}</tbody></table>
    </div>}
  </div>;
}
