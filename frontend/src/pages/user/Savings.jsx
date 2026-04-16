import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Target, Plus, Calendar, Zap, TrendingUp, CheckCircle } from 'lucide-react';

export default function Savings() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name:'', target_amount:'', target_date:'', auto_save:false, auto_save_amount:'', account_id:'' });
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get('/user/savings-goals').then(r => setGoals(r.data));
    api.get('/user/accounts').then(r => setAccounts(r.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/user/savings-goals', form);
      setMsg('Objectif créé avec succès');
      setShowForm(false);
      api.get('/user/savings-goals').then(r => setGoals(r.data));
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur'); }
  };

  const savingsAccounts = accounts.filter(a => a.account_type === 'savings');
  const totalSavings = savingsAccounts.reduce((s,a) => s + parseFloat(a.balance), 0);

  return (
    <Layout title="Épargne">
      <div style={s.page}>
        {msg && <div style={s.msg}>{msg}</div>}

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
            <form onSubmit={handleCreate} style={s.form}>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Nom de l'objectif *</label><input style={s.input} placeholder="Voyage, voiture..." value={form.name} onChange={e => setForm({...form, name:e.target.value})} required /></div>
                <div style={s.field}><label style={s.label}>Montant cible (TND) *</label><input style={s.input} type="number" min="100" step="100" value={form.target_amount} onChange={e => setForm({...form, target_amount:e.target.value})} required /></div>
              </div>
              <div style={s.row}>
                <div style={s.field}><label style={s.label}>Date cible</label><input style={s.input} type="date" value={form.target_date} onChange={e => setForm({...form, target_date:e.target.value})} /></div>
                <div style={s.field}>
                  <label style={s.label}>Compte épargne</label>
                  <select style={s.input} value={form.account_id} onChange={e => setForm({...form, account_id:e.target.value})}>
                    <option value="">Sélectionner</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type} — {parseFloat(a.balance).toFixed(3)} TND</option>)}
                  </select>
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
  msg: { background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d', padding:'12px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'600' },
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
