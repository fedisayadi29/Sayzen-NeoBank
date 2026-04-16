import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';

const TYPES = { transfer_internal:'Virement interne', transfer_interbank:'Virement interbancaire', transfer_swift:'Virement SWIFT', deposit:'Dépôt', withdrawal:'Retrait', payment_bill:'Paiement facture', recharge_mobile:'Recharge mobile', loan_disbursement:'Déblocage crédit', loan_repayment:'Remboursement crédit', fee:'Frais' };
const TYPE_COLORS = { deposit:'#10b981', transfer_internal:'#4f46e5', transfer_interbank:'#7c3aed', withdrawal:'#ef4444', payment_bill:'#f59e0b', recharge_mobile:'#06b6d4', fee:'#64748b' };

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type:'', category:'' });

  useEffect(() => {
    Promise.all([
      api.get(`/user/transactions?limit=50${filter.type ? '&type='+filter.type : ''}${filter.category ? '&category='+filter.category : ''}`),
      api.get('/user/accounts')
    ]).then(([tx, acc]) => {
      setTransactions(tx.data);
      setAccounts(acc.data);
    }).finally(() => setLoading(false));
  }, [filter]);

  const myIds = accounts.map(a => a.id);

  return (
    <Layout title="Transactions">
      <div style={s.page}>
        <div style={s.filters}>
          <select style={s.select} value={filter.type} onChange={e => setFilter({...filter, type:e.target.value})}>
            <option value="">Tous les types</option>
            {Object.entries(TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select style={s.select} value={filter.category} onChange={e => setFilter({...filter, category:e.target.value})}>
            <option value="">Toutes catégories</option>
            {['Salaire','Factures','Épargne','Télécom','Loisirs','Retrait','Alimentation','Transport','Santé'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={s.card}>
          {loading ? <p style={s.loading}>Chargement...</p> : transactions.length === 0 ? <p style={s.empty}>Aucune transaction</p> : (
            <table style={s.table}>
              <thead>
                <tr>{['Date','Référence','Type','Description','De','Vers','Montant','Frais','Statut'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isIn = myIds.includes(tx.to_account_id) && !myIds.includes(tx.from_account_id);
                  const color = TYPE_COLORS[tx.type] || '#64748b';
                  return (
                    <tr key={tx.id} style={s.tr}>
                      <td style={s.td}>{new Date(tx.created_at).toLocaleDateString('fr-TN')}</td>
                      <td style={s.td}><code style={s.ref}>{tx.reference?.slice(0,12)}</code></td>
                      <td style={s.td}><span style={{ ...s.badge, background:color+'18', color }}>{TYPES[tx.type]||tx.type}</span></td>
                      <td style={s.td}>{tx.description||'-'}</td>
                      <td style={s.td}>{tx.from_user||tx.from_acc_num||'-'}</td>
                      <td style={s.td}>{tx.to_user||tx.to_acc_num||'-'}</td>
                      <td style={{ ...s.td, color: isIn ? '#10b981' : '#ef4444', fontWeight:'700' }}>
                        {isIn ? '+' : '-'}{parseFloat(tx.amount).toLocaleString('fr-TN', { minimumFractionDigits:3 })} TND
                      </td>
                      <td style={{ ...s.td, color:'#374151', fontWeight:'600' }}>{parseFloat(tx.fees||0).toFixed(3)}</td>
                      <td style={s.td}><span style={s.statusBadge(tx.status)}>{tx.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1200px' },
  filters: { display:'flex', gap:'12px', marginBottom:'20px' },
  select: { padding:'10px 14px', background:'#fff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500' },
  card: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', overflow:'auto', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  loading: { color:'#374151', textAlign:'center', padding:'40px' },
  empty: { color:'#374151', textAlign:'center', padding:'40px' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'900px' },
  th: { padding:'13px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4ff', background:'#f8faff', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f0f4ff' },
  td: { padding:'12px 14px', fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  ref: { background:'#f5f3ff', color:'#7c3aed', padding:'2px 6px', borderRadius:'4px', fontSize:'11px', fontWeight:'700' },
  badge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  statusBadge: (s) => ({ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background: s==='completed' ? 'rgba(16,185,129,0.1)' : s==='pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: s==='completed' ? '#059669' : s==='pending' ? '#d97706' : '#dc2626' }),
};
