import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Flag, AlertTriangle } from 'lucide-react';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type:'', status:'', flagged:'' });

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ limit:50, ...Object.fromEntries(Object.entries(filter).filter(([,v]) => v)) }).toString();
    api.get(`/admin/transactions?${q}`).then(r => setTransactions(r.data)).finally(() => setLoading(false));
  }, [filter]);

  const flagTx = async (id) => {
    const reason = prompt('Raison du signalement:');
    if (!reason) return;
    await api.patch(`/admin/transactions/${id}/flag`, { flag_reason:reason });
    setTransactions(transactions.map(t => t.id === id ? { ...t, is_flagged:true, flag_reason:reason } : t));
  };

  const typeColors = { transfer_internal:'#4f46e5', transfer_interbank:'#7c3aed', deposit:'#10b981', withdrawal:'#ef4444', payment_bill:'#f59e0b', recharge_mobile:'#06b6d4' };

  return (
    <Layout title="Transactions">
      <div style={s.page}>
        <div style={s.toolbar}>
          <select style={s.filter} value={filter.type} onChange={e => setFilter({...filter, type:e.target.value})}>
            <option value="">Tous les types</option>
            {['transfer_internal','transfer_interbank','transfer_swift','deposit','withdrawal','payment_bill','recharge_mobile'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
          <select style={s.filter} value={filter.status} onChange={e => setFilter({...filter, status:e.target.value})}>
            <option value="">Tous les statuts</option>
            {['pending','processing','completed','failed','cancelled','blocked'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={s.filter} value={filter.flagged} onChange={e => setFilter({...filter, flagged:e.target.value})}>
            <option value="">Toutes</option>
            <option value="true">Signalées uniquement</option>
          </select>
          <span style={s.count}>{transactions.length} transaction(s)</span>
        </div>

        <div style={s.card}>
          {loading ? <p style={s.loading}>Chargement...</p> : (
            <table style={s.table}>
              <thead>
                <tr>{['Référence','Type','De','Vers','Montant','Frais','Statut','Date','Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ ...s.tr, ...(tx.is_flagged ? s.flaggedRow : {}) }}>
                    <td style={s.td}>
                      <code style={s.ref}>{tx.reference?.slice(0,12)}</code>
                      {tx.is_flagged && <AlertTriangle size={12} color="#ef4444" style={{ marginLeft:'6px', verticalAlign:'middle' }} title={tx.flag_reason} />}
                    </td>
                    <td style={s.td}><span style={{ ...s.badge, background:(typeColors[tx.type]||'#64748b')+'18', color:typeColors[tx.type]||'#64748b' }}>{tx.type?.replace(/_/g,' ')}</span></td>
                    <td style={s.td}>{tx.from_user||tx.from_acc||'-'}</td>
                    <td style={s.td}>{tx.to_user||tx.to_acc||'-'}</td>
                    <td style={{ ...s.td, color:'#10b981', fontWeight:'700' }}>{parseFloat(tx.amount).toFixed(3)} TND</td>
                    <td style={{ ...s.td, color:'#64748b' }}>{parseFloat(tx.fees||0).toFixed(3)}</td>
                    <td style={s.td}><span style={s.statusBadge(tx.status)}>{tx.status}</span></td>
                    <td style={s.td}>{new Date(tx.created_at).toLocaleDateString('fr-TN')}</td>
                    <td style={s.td}>
                      {!tx.is_flagged && (
                        <button style={s.flagBtn} onClick={() => flagTx(tx.id)} title="Signaler">
                          <Flag size={13} color="#dc2626" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1300px' },
  toolbar: { display:'flex', gap:'10px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap' },
  filter: { padding:'9px 13px', background:'#fff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'12px', outline:'none', fontWeight:'500' },
  count: { fontSize:'12px', color:'#1e293b', fontWeight:'600' },
  card: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', overflow:'auto', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  loading: { color:'#374151', textAlign:'center', padding:'40px' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'1000px' },
  th: { padding:'11px 13px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#374151', textTransform:'uppercase', borderBottom:'2px solid #f0f4ff', background:'#f8faff', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f0f4ff' },
  flaggedRow: { background:'#fff5f5' },
  td: { padding:'10px 13px', fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  ref: { background:'#f5f3ff', color:'#7c3aed', padding:'2px 5px', borderRadius:'4px', fontSize:'10px', fontWeight:'700' },
  flagIcon: { marginLeft:'6px', fontSize:'12px' },
  badge: { padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:'700' },
  statusBadge: (s) => ({ padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', background: s==='completed' ? '#f0fdf4' : s==='pending' ? '#fffbeb' : s==='blocked' ? '#fef2f2' : '#f8faff', color: s==='completed' ? '#15803d' : s==='pending' ? '#d97706' : s==='blocked' ? '#dc2626' : '#374151' }),
  flagBtn: { width:'28px', height:'28px', background:'#fef2f2', border:'none', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
};
