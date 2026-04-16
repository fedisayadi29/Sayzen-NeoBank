import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Car, Home, GraduationCap, Briefcase, User, Calculator, FileText, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const LOAN_TYPES = [
  { value:'personal',  label:'Crédit personnel',      Icon: User,           rate:8.5,  maxAmount:50000,  maxMonths:84  },
  { value:'auto',      label:'Crédit auto',            Icon: Car,            rate:7.2,  maxAmount:80000,  maxMonths:84  },
  { value:'mortgage',  label:'Crédit immobilier',      Icon: Home,           rate:5.5,  maxAmount:500000, maxMonths:300 },
  { value:'business',  label:'Crédit professionnel',   Icon: Briefcase,      rate:9.0,  maxAmount:200000, maxMonths:120 },
  { value:'student',   label:'Crédit étudiant',        Icon: GraduationCap,  rate:4.5,  maxAmount:20000,  maxMonths:120 },
];

const STATUS_COLORS = { pending:'#f59e0b', under_review:'#3b82f6', approved:'#10b981', rejected:'#ef4444', disbursed:'#a78bfa', active:'#10b981', closed:'#64748b' };
const STATUS_LABELS = { pending:'En attente', under_review:'En révision', approved:'Approuvé', rejected:'Refusé', disbursed:'Débloqué', active:'Actif', closed:'Clôturé' };

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ loan_type:'personal', amount_requested:'', duration_months:'', purpose:'' });
  const [simulation, setSimulation] = useState(null);
  const [msg, setMsg] = useState({ text:'', type:'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/user/loans').then(r => setLoans(r.data)); }, []);

  const simulate = () => {
    const type = LOAN_TYPES.find(t => t.value === form.loan_type);
    if (!form.amount_requested || !form.duration_months || !type) return;
    const rate = type.rate / 100 / 12;
    const n = parseInt(form.duration_months);
    const p = parseFloat(form.amount_requested);
    const monthly = (p * rate) / (1 - Math.pow(1 + rate, -n));
    const total = monthly * n;
    setSimulation({ monthly: monthly.toFixed(3), total: total.toFixed(3), interest: (total - p).toFixed(3), rate: type.rate });
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/user/loans/apply', form);
      setMsg({ text:'Demande de crédit soumise avec succès. Vous serez notifié de la décision.', type:'success' });
      api.get('/user/loans').then(r => setLoans(r.data));
      setTab('list');
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' });
    } finally { setLoading(false); }
  };

  return (
    <Layout title="Crédits">
      <div style={s.page}>
        {msg.text && <div style={s.alert(msg.type)}>{msg.type==='success' ? '✓' : '⚠'} {msg.text}</div>}

        <div style={s.tabs}>
          {[['list','Mes crédits'],['apply','Nouvelle demande'],['simulate','Simulateur']].map(([k,l]) => (
            <button key={k} style={{ ...s.tab, ...(tab===k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'list' && (
          <div>
            {loans.length === 0 ? <p style={s.empty}>Aucun crédit</p> : loans.map(loan => (
              <div key={loan.id} style={s.loanCard}>
                <div style={s.loanHeader}>
                  <div style={s.loanType}>
                    <div style={s.loanIconWrap}>
                      {(() => { const T = LOAN_TYPES.find(t => t.value===loan.loan_type); return T ? <T.Icon size={20} color="#6366f1" strokeWidth={2} /> : <TrendingUp size={20} color="#6366f1" strokeWidth={2} />; })()}
                    </div>
                    <div>
                      <p style={s.loanTypeName}>{LOAN_TYPES.find(t => t.value===loan.loan_type)?.label || loan.loan_type}</p>
                      <p style={s.loanDate}>{new Date(loan.created_at).toLocaleDateString('fr-TN')}</p>
                    </div>
                  </div>
                  <span style={{ ...s.statusBadge, background: STATUS_COLORS[loan.status]+'18', color: STATUS_COLORS[loan.status] }}>
                    {STATUS_LABELS[loan.status] || loan.status}
                  </span>
                </div>
                <div style={s.loanStats}>
                  <div style={s.loanStat}><p style={s.statLabel}>Montant demandé</p><p style={s.statVal}>{parseFloat(loan.amount_requested).toFixed(3)} TND</p></div>
                  <div style={s.loanStat}><p style={s.statLabel}>Durée</p><p style={s.statVal}>{loan.duration_months} mois</p></div>
                  <div style={s.loanStat}><p style={s.statLabel}>Taux</p><p style={s.statVal}>{loan.interest_rate}%</p></div>
                  <div style={s.loanStat}><p style={s.statLabel}>Mensualité</p><p style={s.statVal}>{parseFloat(loan.monthly_payment||0).toFixed(3)} TND</p></div>
                  {loan.ai_score && <div style={s.loanStat}><p style={s.statLabel}>Score IA</p><p style={{ ...s.statVal, color: loan.ai_score >= 600 ? '#10b981' : '#ef4444' }}>{loan.ai_score}/850</p></div>}
                </div>
                {loan.purpose && <p style={s.loanPurpose}>Objet: {loan.purpose}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'apply' && (
          <div style={s.formCard}>
            <h3 style={s.formTitle}>Demande de crédit</h3>
            <form onSubmit={handleApply} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Type de crédit</label>
                <div style={s.typeGrid}>
                  {LOAN_TYPES.map(t => (
                    <div key={t.value} style={{ ...s.typeCard, ...(form.loan_type===t.value ? s.typeCardActive : {}) }}
                      onClick={() => setForm({...form, loan_type:t.value})}>
                      <div style={{ width:'32px', height:'32px', borderRadius:'8px', background: form.loan_type===t.value ? '#f5f3ff' : '#f8faff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <t.Icon size={16} color={form.loan_type===t.value ? '#6366f1' : '#64748b'} strokeWidth={2} />
                      </div>
                      <div>
                        <p style={s.typeLabel}>{t.label}</p>
                        <p style={s.typeRate}>Taux: {t.rate}% / an</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Montant souhaité (TND) *</label>
                  <input style={s.input} type="number" min="500" step="100" placeholder="10000" value={form.amount_requested}
                    onChange={e => setForm({...form, amount_requested:e.target.value})} required />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Durée (mois) *</label>
                  <input style={s.input} type="number" min="6" max="300" step="6" placeholder="36" value={form.duration_months}
                    onChange={e => setForm({...form, duration_months:e.target.value})} required />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Objet du crédit</label>
                <textarea style={{ ...s.input, minHeight:'80px', resize:'vertical' }} placeholder="Décrivez l'objet de votre demande..." value={form.purpose}
                  onChange={e => setForm({...form, purpose:e.target.value})} />
              </div>
              <button style={s.btn} type="submit" disabled={loading}>{loading ? '⏳ Envoi...' : '📋 Soumettre la demande'}</button>
            </form>
          </div>
        )}

        {tab === 'simulate' && (
          <div style={s.simCard}>
            <h3 style={s.formTitle}>Simulateur de crédit</h3>
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Type</label>
                <select style={s.input} value={form.loan_type} onChange={e => setForm({...form, loan_type:e.target.value})}>
                  {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.rate}%</option>)}
                </select>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Montant (TND)</label><input style={s.input} type="number" value={form.amount_requested} onChange={e => setForm({...form, amount_requested:e.target.value})} /></div>
                <div style={s.field}><label style={s.label}>Durée (mois)</label><input style={s.input} type="number" value={form.duration_months} onChange={e => setForm({...form, duration_months:e.target.value})} /></div>
              </div>
              <button style={s.btn} type="button" onClick={simulate}>Calculer</button>
            </div>
            {simulation && (
              <div style={s.simResult}>
                <div style={s.simRow}><span style={s.simLabel}>Mensualité</span><span style={s.simVal}>{simulation.monthly} TND</span></div>
                <div style={s.simRow}><span style={s.simLabel}>Coût total</span><span style={s.simVal}>{simulation.total} TND</span></div>
                <div style={s.simRow}><span style={s.simLabel}>Intérêts totaux</span><span style={{ ...s.simVal, color:'#ef4444' }}>{simulation.interest} TND</span></div>
                <div style={s.simRow}><span style={s.simLabel}>Taux annuel</span><span style={s.simVal}>{simulation.rate}%</span></div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'900px' },
  alert: (type) => ({ background: type==='success' ? '#f0fdf4' : '#fef2f2', border:`1px solid ${type==='success' ? '#bbf7d0' : '#fecaca'}`, color: type==='success' ? '#15803d' : '#dc2626', padding:'12px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'500' }),
  tabs: { display:'flex', gap:'4px', marginBottom:'20px', background:'#f0f4ff', padding:'4px', borderRadius:'12px' },
  tab: { flex:1, padding:'9px', background:'none', border:'none', color:'#374151', fontSize:'13px', fontWeight:'600', borderRadius:'10px', cursor:'pointer' },
  tabActive: { background:'#fff', color:'#6366f1', fontWeight:'700', boxShadow:'0 2px 8px rgba(99,102,241,0.1)' },
  empty: { color:'#374151', textAlign:'center', padding:'40px', fontSize:'13px', fontWeight:'500' },
  loanCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', padding:'20px', marginBottom:'14px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  loanHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' },
  loanType: { display:'flex', alignItems:'center', gap:'12px' },
  loanIconWrap: { width:'40px', height:'40px', borderRadius:'12px', background:'#f5f3ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  loanTypeName: { fontSize:'15px', fontWeight:'700', color:'#0f172a' },
  loanDate: { fontSize:'11px', color:'#374151', fontWeight:'500' },
  statusBadge: { padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' },
  loanStats: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px' },
  loanStat: { background:'#f8faff', borderRadius:'10px', padding:'10px', border:'1px solid #f0f4ff' },
  statLabel: { fontSize:'10px', color:'#374151', marginBottom:'4px', textTransform:'uppercase', fontWeight:'700' },
  statVal: { fontSize:'14px', fontWeight:'800', color:'#0f172a' },
  loanPurpose: { fontSize:'12px', color:'#374151', marginTop:'12px', fontStyle:'italic', fontWeight:'500' },
  formCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'20px', padding:'24px', maxWidth:'600px', boxShadow:'0 2px 16px rgba(99,102,241,0.06)' },
  simCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'20px', padding:'24px', maxWidth:'500px', boxShadow:'0 2px 16px rgba(99,102,241,0.06)' },
  formTitle: { fontSize:'16px', fontWeight:'800', color:'#0f172a', marginBottom:'20px' },
  form: { display:'flex', flexDirection:'column', gap:'16px' },
  field: { display:'flex', flexDirection:'column', gap:'7px' },
  label: { fontSize:'12px', fontWeight:'700', color:'#374151' },
  input: { padding:'11px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  typeGrid: { display:'flex', flexDirection:'column', gap:'8px' },
  typeCard: { display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', cursor:'pointer', transition:'all 0.2s' },
  typeCardActive: { background:'#f5f3ff', border:'2px solid #6366f1' },
  typeIcon: { fontSize:'20px' },
  typeLabel: { fontSize:'13px', color:'#0f172a', fontWeight:'700' },
  typeRate: { fontSize:'11px', color:'#374151', fontWeight:'600' },
  btn: { padding:'13px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 16px rgba(99,102,241,0.3)' },
  simResult: { marginTop:'20px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:'14px', padding:'16px', display:'flex', flexDirection:'column', gap:'10px' },
  simRow: { display:'flex', justifyContent:'space-between' },
  simLabel: { fontSize:'13px', color:'#374151', fontWeight:'600' },
  simVal: { fontSize:'14px', fontWeight:'800', color:'#0f172a' },
};
