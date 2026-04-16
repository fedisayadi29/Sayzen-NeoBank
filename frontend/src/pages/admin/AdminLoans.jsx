import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { CheckCircle, XCircle, Search, ChevronDown } from 'lucide-react';

const STATUS_COLORS = { pending:'#f59e0b', under_review:'#3b82f6', approved:'#10b981', rejected:'#ef4444', disbursed:'#a78bfa', active:'#10b981', closed:'#64748b' };

export default function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [decision, setDecision] = useState({ status:'', amount_approved:'' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = [];
    if (filter) params.push(`status=${filter}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    api.get(`/admin/loans${params.length ? '?'+params.join('&') : ''}`).then(r => setLoans(r.data)).finally(() => setLoading(false));
  }, [filter, search]);

  const handleDecision = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/admin/loans/${modal.id}`, decision);
      setMsg('Décision enregistrée');
      setModal(null);
      api.get(`/admin/loans${filter ? '?status='+filter : ''}`).then(r => setLoans(r.data));
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <Layout title="Gestion des crédits">
      <div style={s.page}>
        {msg && <div style={s.msg}>{msg}</div>}
        <div style={s.toolbar}>
          <div style={s.searchWrap}>
            <Search size={16} color="#94a3b8" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)' }} />
            <input
              style={s.search}
              placeholder="Rechercher un client, email, CIN ou téléphone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select style={s.filter} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            {['pending','under_review','approved','rejected','disbursed','active','closed'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={s.count}>{loans.length} crédit(s)</span>
        </div>

        <div style={s.card}>
          {loading ? <p style={s.loading}>Chargement...</p> : (
            <table style={s.table}>
              <thead>
                <tr>{['Client','Type','Montant','Durée','Taux','Mensualité','Score IA','Statut','Date','Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loans.map(l => (
                  <tr key={l.id} style={s.tr}>
                    <td style={s.td}>
                      <p style={s.clientName}><Link to={`/admin/users/${l.user_id}`} style={s.clientLink}>{l.client_name}</Link></p>
                      <p style={s.clientEmail}>{l.email}</p>
                    </td>
                    <td style={s.td}>{l.loan_type}</td>
                    <td style={{ ...s.td, fontWeight:'700', color:'#e2e8f0' }}>{parseFloat(l.amount_requested).toFixed(3)} TND</td>
                    <td style={s.td}>{l.duration_months} mois</td>
                    <td style={s.td}>{l.interest_rate}%</td>
                    <td style={s.td}>{parseFloat(l.monthly_payment||0).toFixed(3)} TND</td>
                    <td style={s.td}>
                      <span style={{ color: l.ai_score >= 600 ? '#10b981' : l.ai_score >= 450 ? '#f59e0b' : '#ef4444', fontWeight:'700' }}>
                        {l.ai_score}/850
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.statusBadge, background:STATUS_COLORS[l.status]+'18', color:STATUS_COLORS[l.status] }}>{l.status}</span>
                    </td>
                    <td style={s.td}>{new Date(l.created_at).toLocaleDateString('fr-TN')}</td>
                    <td style={s.td}>
                      {['pending','under_review'].includes(l.status) && (
                        <button style={s.decideBtn} onClick={() => { setModal(l); setDecision({ status:'', amount_approved:l.amount_requested }); }}>
                          Décider
                        </button>
                      )}                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {modal && (
          <div style={s.overlay}>
            <div style={s.modalCard}>
              <h3 style={s.modalTitle}>Décision crédit</h3>
              <div style={s.modalInfo}>
                <p style={s.modalClient}>{modal.client_name} — Score crédit: {modal.credit_score}</p>
                <p style={s.modalDetails}>{modal.loan_type} · {parseFloat(modal.amount_requested).toFixed(3)} TND · {modal.duration_months} mois</p>
                <p style={s.modalAI}>Score IA: <strong style={{ color: modal.ai_score >= 600 ? '#10b981' : '#ef4444' }}>{modal.ai_score}/850</strong> — Recommandation: <strong>{modal.ai_recommendation}</strong></p>
                {modal.purpose && <p style={s.modalPurpose}>Objet: {modal.purpose}</p>}
              </div>
              <form onSubmit={handleDecision} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>Décision *</label>
                  <select style={s.input} value={decision.status} onChange={e => setDecision({...decision, status:e.target.value})} required>
                    <option value="">Sélectionner</option>
                    <option value="approved">✓ Approuver</option>
                    <option value="rejected">✗ Refuser</option>
                    <option value="under_review">🔍 Mettre en révision</option>
                  </select>
                </div>
                {decision.status === 'approved' && (
                  <div style={s.field}>
                    <label style={s.label}>Montant approuvé (TND)</label>
                    <input style={s.input} type="number" value={decision.amount_approved} onChange={e => setDecision({...decision, amount_approved:e.target.value})} />
                  </div>
                )}
                <div style={s.modalBtns}>
                  <button type="button" style={s.cancelBtn} onClick={() => setModal(null)}>Annuler</button>
                  <button type="submit" style={s.confirmBtn}>Confirmer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1300px' },
  msg: { background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d', padding:'12px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', fontWeight:'600' },
  toolbar: { display:'flex', gap:'12px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap' },
  searchWrap: { position:'relative', flex:'1 1 280px', minWidth:'250px' },
  search: { width:'100%', padding:'10px 14px 10px 38px', background:'#fff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'12px', outline:'none', fontWeight:'500', boxSizing:'border-box' },
  filter: { padding:'9px 13px', background:'#fff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'12px', outline:'none', fontWeight:'500' },
  clientLink: { color:'#3b82f6', textDecoration:'none', fontWeight:'700' },
  count: { fontSize:'12px', color:'#1e293b', fontWeight:'600' },
  card: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', overflow:'auto', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  loading: { color:'#374151', textAlign:'center', padding:'40px' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'1000px' },
  th: { padding:'11px 13px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#374151', textTransform:'uppercase', borderBottom:'2px solid #f0f4ff', background:'#f8faff', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f0f4ff' },
  td: { padding:'10px 13px', fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  clientName: { fontSize:'13px', color:'#0f172a', fontWeight:'700' },
  clientEmail: { fontSize:'10px', color:'#374151', fontWeight:'500' },
  statusBadge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' },
  decideBtn: { padding:'5px 12px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'6px', color:'#fff', fontSize:'11px', fontWeight:'700', cursor:'pointer' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 },
  modalCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'20px', padding:'28px', width:'480px', boxShadow:'0 24px 80px rgba(99,102,241,0.2)' },
  modalTitle: { fontSize:'17px', fontWeight:'800', color:'#0f172a', marginBottom:'16px' },
  modalInfo: { background:'#f8faff', borderRadius:'12px', padding:'14px', marginBottom:'20px', border:'1px solid #e8edf8' },
  modalClient: { fontSize:'14px', color:'#0f172a', fontWeight:'700', marginBottom:'4px' },
  modalDetails: { fontSize:'12px', color:'#374151', marginBottom:'4px', fontWeight:'500' },
  modalAI: { fontSize:'12px', color:'#374151', marginBottom:'4px', fontWeight:'500' },
  modalPurpose: { fontSize:'12px', color:'#1e293b', fontStyle:'italic', fontWeight:'500' },
  form: { display:'flex', flexDirection:'column', gap:'14px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', color:'#374151', fontWeight:'600' },
  input: { padding:'11px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'13px', outline:'none' },
  modalBtns: { display:'flex', gap:'10px', justifyContent:'flex-end' },
  cancelBtn: { padding:'10px 20px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'8px', color:'#374151', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  confirmBtn: { padding:'10px 24px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
};
