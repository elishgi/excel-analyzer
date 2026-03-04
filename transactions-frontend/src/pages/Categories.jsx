import { useEffect, useState } from 'react';
import { createCategory, deleteCategory, getCategories } from '../api/categories.js';

const BOXES = ['INCOME','SUBSCRIPTIONS','VARIABLE','SAVINGS','TITHES','MANUAL_EXPENSES'];

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [boxKey, setBoxKey] = useState('VARIABLE');
  const load = async () => setRows(await getCategories());
  useEffect(() => { load(); }, []);
  return <div className="page"><h1>קטגוריות</h1><div className="card">
    <div className="flex gap-8"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="שם" /><select className="input" value={boxKey} onChange={(e) => setBoxKey(e.target.value)}>{BOXES.map((b)=><option key={b}>{b}</option>)}</select><button className="btn btn-primary" onClick={async()=>{await createCategory({name,boxKey});setName('');await load();}}>הוסף</button></div>
    <table className="table"><thead><tr><th>name</th><th>boxKey</th><th>actions</th></tr></thead><tbody>{rows.map((r)=><tr key={r._id}><td>{r.name}</td><td>{r.boxKey}</td><td><button className="btn btn-danger" onClick={async()=>{await deleteCategory(r._id,{});await load();}}>מחק</button></td></tr>)}</tbody></table>
  </div></div>;
}
