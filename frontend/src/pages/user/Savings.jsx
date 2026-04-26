import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Target, Plus, Plane, Car, Home, GraduationCap, Heart, Briefcase, Baby, Smartphone } from 'lucide-react';

const GOAL_PRESETS = [
  { name:'Voyage à Paris',        amount:5000,   Icon: Plane,          color:'#6366f1' },
  { name:'Voiture neuve',         amount:35000,  Icon: Car,            color:'#f59e0b' },
  { name:'Apport immobilier',     amount:50000,  Icon: Home,           color:'#10b981' },
  { name:'Études supérieures',    amount:15000,  Icon: GraduationCap,  color:'#8b5cf6' },
  { name:'Fonds d\'urgence',      amount:10000,  Icon: Briefcase,      color:'#ef4444' },
  { name:'Mariage',               amount:25000,  Icon: Heart,          color:'#ec4899' },
  { name:'Bébé & famille',        amount:8000,   Icon: Baby,           color:'#06b6d4' },
  { name:'Nouveau smartphone',    amount:2000,   Icon: Smartphone,     color:'#64748b' },
];

export default function Savings() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name:'', target_amount:'', target_date:'', auto_save:false, auto_save_amount:'' });
  const [msg, setMsg] = useState({ text:'', type:'success' });
  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState(null); // holds the auto-created account info

  useEffect(() => {
    api.get('/user/savings-goals').then(r => setGoals(r.data));
    api.get('/user/accounts').then(r => setAccounts(r.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/user/savings-goals', form);
      setNewAccount(r.data.account); // show the new account details
      setMsg({ text: r.data.message, type:'success' });
      setShowForm(false);
      setForm({ name:'', target_amount:'', target_date:'', auto_save:false, auto_save_amount:'' });
      api.get('/user/savings-goals').then(res => setGoals(res.data));
      api.get('/user/accounts').then(res => setAccounts(res.data));
    } catch (err) { setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' }); }
  };

  const savingsAccounts = accounts.filter(a => a.account_type === 'savings');
  const totalSavings = savingsAccounts.reduce((s,a) => s + parseFloat(a.balance), 0);

  return (
    <Layout title="Épargne">
      <div style={s.page}>
        {msg.text && (
          <div style={{ ...s.msg, background: msg.type==='success' ? '#f0fdf4' : '#fef2f2', border:`1px solid ${msg.type==='success' ? '#bbf7d0' : '#fecaca'}`, color: msg.type==='success' ? '#15803d' : '#dc2626' }}>
            {msg.text}
          </div>
        )}

        {/* New account info modal */}
        {newAccount && (
          <div style={s.accountModal}>
            <div style={s.accountModalHeader}>
              <Target size={22} color="#10b981" style={{ marginRight:'10px' }} />
              <span style={s.accountModalTitle}>Compte d'épargne créé automatiquement</span>
              <button style={s.accountModalClose} onClick={() => setNewAccount(null)}>✕</button>
            </div>
            <p style={s.accountModalSub}>Voici les coordonnées de votre nouveau compte dédié à cet objectif :</p>
            <div style={s.accountModalGrid}>
              {[
                ['Numéro de compte', newAccount.account_number],
                ['RIB', newAccount.rib],
                ['IBAN', newAccount.iban],
                ['Type', 'Épargne'],
                ['Taux d\'intérêt', `${newAccount.interest_rate}% / an`],
                ['Solde initial', '0.000 TND'],
              ].map(([label, value]) => (
                <div key={label} style={s.accountModalRow}>
                  <span style={s.accountModalLabel}>{label}</span>
                  <div style={s.accountModalValWrap}>
                    <span style={s.accountModalVal}>{value}</span>
                    <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(value)} title="Copier">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p style={s.accountModalNote}>Conservez ces informations. Vous pouvez les retrouver dans la section "Mes comptes".</p>
          </div>
        )}

        {/* Savings Summary */}
        <div style={s.summaryCard}>
          <div>
            <p style={s.sumLabel}>Total épargne</p>
            <p style={s.sumAmt}>{totalSavings.toLocaleString('fr-TN', { minimumFractionDigits:3 })} TND</p>
          </div>
          <div style={s.sumRight}>
            {savingsAccounts.map(a => (
              <div key={a.id} style={s.savAcc}>
                <span style={s.savAccLabel}>{a.account_type}</span>
                <span style={s.savAccRate}>+{a.interest_rate}% / an</span>
                <span style={s.savAccBal}>{parseFloat(a.balance).toFixed(3)} TND</span>
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div style={s.goalsHeader}>
          <h3 style={s.goalsTitle}>Objectifs d'épargne</h3>
          <button style={s.addBtn} onClick={() => setShowForm(!showForm)}>
            <Plus size={16} style={{ marginRight:'6px', verticalAlign:'middle' }} />
            Nouvel objectif
          </button>
        </div>

        {showForm && (
          <div style={s.formCard}>
            {/* Quick presets */}
            <p style={s.presetsLabel}>Suggestions rapides</p>
            <div style={s.presetsGrid}>
              {GOAL_PRESETS.map(p => (
                <button key={p.name} type="button"
                  style={{ ...s.presetBtn, borderColor: form.name === p.name ? p.color : '#e8edf8', background: form.name === p.name ? p.color+'12' : '#f8faff' }}
                  onClick={() => setForm({ ...form, name: p.name, target_amount: p.amount.toString() })}>
                  <p.Icon size={16} color={p.color} strokeWidth={2} />
                  <span style={{ fontSize:'11px', fontWeight:'700', color: form.name === p.name ? p.color : '#374151' }}>{p.name}</span>
                  <span style={{ fontSize:'10px', color:'#94a3b8', fontWeight:'600' }}>{p.amount.toLocaleString()} TND</span>
                </button>
              ))}
            </div>
            <form onSubmit={handleCreate} style={s.form}>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Nom de l'objectif *</label><input style={s.input} placeholder="Voyage, voiture..." value={form.name} onChange={e => setForm({...form, name:e.target.value})} required /></div>
                <div style={s.field}><label style={s.label}>Montant cible (TND) *</label><input style={s.input} type="number" min="100" step="100" value={form.target_amount} onChange={e => setForm({...form, target_amount:e.target.value})} required /></div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Date cible</label><input style={s.input} type="date" value={form.target_date} onChange={e => setForm({...form, target_date:e.target.value})} /></div>
                <div style={s.field}>
                  <label style={s.label}>Compte dédié</label>
                  <div style={{ ...s.input, background:'#f0fdf4', border:'2px solid #bbf7d0', color:'#15803d', fontSize:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <Target size={14} color="#10b981" />
                    Un compte d'épargne dédié sera créé automatiquement
                  </div>
                </div>
              </div>
              <div style={s.autoSaveRow}>
                <label style={s.checkLabel}>
                  <input type="checkbox" checked={form.auto_save} onChange={e => setForm({...form, auto_save:e.target.checked})} />
                  Épargne automatique mensuelle
                </label>
                {form.auto_save && (
                  <input style={{ ...s.input, width:'160px' }} type="number" min="10" step="10" placeholder="Montant/mois" value={form.auto_save_amount}
                    onChange={e => setForm({...form, auto_save_amount:e.target.value})} />
                )}
              </div>
              <div style={s.formBtns}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btn}>
                <Target size={15} style={{ marginRight:'6px', verticalAlign:'middle' }} />
                Créer l'objectif
              </button>
              </div>
            </form>
          </div>
        )}

        <div style={s.goalsGrid}>
          {goals.length === 0 ? <p style={s.empty}>Aucun objectif d'épargne</p> : goals.map(g => {
            const pct = Math.min(100, (parseFloat(g.current_amount) / parseFloat(g.target_amount)) * 100);
            const daysLeft = g.target_date ? Math.ceil((new Date(g.target_date) - new Date()) / (1000*60*60*24)) : null;
            return (
              <div key={g.id} style={s.goalCard}>
                <div style={s.goalHeader}>
                  <p style={s.goalName}>{g.name}</p>
                  <span style={s.goalStatus(g.status)}>{g.status}</span>
                </div>
                <div style={s.goalAmts}>
                  <span style={s.goalCurrent}>{parseFloat(g.current_amount).toFixed(3)} TND</span>
                  <span style={s.goalTarget}>/ {parseFloat(g.target_amount).toFixed(3)} TND</span>
                </div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width:`${pct}%` }} />
                </div>
                <div style={s.goalMeta}>
                  <span style={s.goalPct}>{pct.toFixed(1)}% atteint</span>
                  {daysLeft !== null && <span style={s.goalDays}>{daysLeft > 0 ? `${daysLeft} jours restants` : 'Échéance dépassée'}</span>}
                </div>
                {g.auto_save && <p style={s.autoSaveInfo}>⚡ Épargne auto: {parseFloat(g.auto_save_amount).toFixed(3)} TND/mois</p>}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'900px' },
  msg: { padding:'12px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'600' },
  accountModal: { background:'#fff', border:'2px solid #10b981', borderRadius:'20px', padding:'24px', marginBottom:'24px', boxShadow:'0 8px 32px rgba(16,185,129,0.15)' },
  accountModalHeader: { display:'flex', alignItems:'center', marginBottom:'10px' },
  accountModalTitle: { fontSize:'16px', fontWeight:'800', color:'#0f172a', flex:1 },
  accountModalClose: { background:'none', border:'none', fontSize:'18px', color:'#94a3b8', cursor:'pointer', padding:'0 4px' },
  accountModalSub: { fontSize:'13px', color:'#374151', marginBottom:'16px', fontWeight:'500' },
  accountModalGrid: { display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' },
  accountModalRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#f8faff', borderRadius:'10px', border:'1px solid #e8edf8' },
  accountModalLabel: { fontSize:'12px', color:'#374151', fontWeight:'600' },
  accountModalValWrap: { display:'flex', alignItems:'center', gap:'8px' },
  accountModalVal: { fontSize:'12px', color:'#0f172a', fontWeight:'700', fontFamily:'monospace' },
  copyBtn: { background:'#ede9fe', border:'none', borderRadius:'4px', padding:'3px 6px', cursor:'pointer', color:'#6366f1', display:'flex', alignItems:'center' },
  accountModalNote: { fontSize:'11px', color:'#15803d', fontWeight:'600', background:'#f0fdf4', padding:'8px 12px', borderRadius:'8px', border:'1px solid #bbf7d0' },
  summaryCard: { background:'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)', borderRadius:'20px', padding:'24px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 12px 40px rgba(99,102,241,0.3)' },
  sumLabel: { color:'rgba(255,255,255,0.8)', fontSize:'12px', marginBottom:'6px', fontWeight:'600' },
  sumAmt: { fontSize:'32px', fontWeight:'800', color:'#fff' },
  sumRight: { display:'flex', flexDirection:'column', gap:'8px' },
  savAcc: { display:'flex', gap:'12px', alignItems:'center', background:'rgba(255,255,255,0.15)', padding:'8px 14px', borderRadius:'10px' },
  savAccLabel: { fontSize:'11px', color:'rgba(255,255,255,0.7)', textTransform:'uppercase', fontWeight:'600' },
  savAccRate: { fontSize:'12px', color:'#a7f3d0', fontWeight:'700' },
  savAccBal: { fontSize:'13px', color:'#fff', fontWeight:'800' },
  goalsHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' },
  goalsTitle: { fontSize:'16px', fontWeight:'800', color:'#0f172a' },
  addBtn: { padding:'9px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(99,102,241,0.3)' },
  formCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', padding:'20px', marginBottom:'20px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  presetsLabel: { fontSize:'11px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' },
  presetsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'8px', marginBottom:'20px' },
  presetBtn: { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'10px 8px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', cursor:'pointer', transition:'all 0.15s', textAlign:'center' },
  form: { display:'flex', flexDirection:'column', gap:'14px' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'700', color:'#374151' },
  input: { padding:'11px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500' },
  autoSaveRow: { display:'flex', alignItems:'center', gap:'16px' },
  checkLabel: { display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#1e293b', cursor:'pointer', fontWeight:'600' },
  formBtns: { display:'flex', gap:'10px', justifyContent:'flex-end' },
  cancelBtn: { padding:'10px 20px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#374151', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  btn: { padding:'10px 24px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
  goalsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px' },
  empty: { color:'#374151', textAlign:'center', padding:'40px', fontSize:'13px', fontWeight:'500' },
  goalCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', padding:'20px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  goalHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' },
  goalName: { fontSize:'15px', fontWeight:'800', color:'#0f172a' },
  goalStatus: (s) => ({ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background: s==='active' ? '#f0fdf4' : '#f8faff', color: s==='active' ? '#15803d' : '#374151' }),
  goalAmts: { marginBottom:'10px' },
  goalCurrent: { fontSize:'20px', fontWeight:'800', color:'#0f172a' },
  goalTarget: { fontSize:'13px', color:'#374151', fontWeight:'600' },
  progressBar: { height:'8px', background:'#f0f4ff', borderRadius:'4px', marginBottom:'8px', overflow:'hidden' },
  progressFill: { height:'100%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius:'4px', transition:'width 0.5s' },
  goalMeta: { display:'flex', justifyContent:'space-between' },
  goalPct: { fontSize:'12px', color:'#6366f1', fontWeight:'700' },
  goalDays: { fontSize:'11px', color:'#374151', fontWeight:'600' },
  autoSaveInfo: { fontSize:'11px', color:'#15803d', marginTop:'8px', fontWeight:'600' },
};
