import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Zap, Droplets, Wifi, Phone, Tv, Music, ShoppingBag, Car, Home, GraduationCap, CheckCircle, Send } from 'lucide-react';

const BILLERS = [
  // Énergie & Eau
  { code:'STEG001',     name:'STEG',              category:'Énergie',      Icon: Zap,           color:'#f59e0b' },
  { code:'SONEDE001',   name:'SONEDE',            category:'Eau',          Icon: Droplets,      color:'#06b6d4' },
  // Internet & Télécom
  { code:'TOPNET001',   name:'Topnet',            category:'Internet',     Icon: Wifi,          color:'#6366f1' },
  { code:'HEXABYTE001', name:'Hexabyte',          category:'Internet',     Icon: Wifi,          color:'#8b5cf6' },
  { code:'OOREDOO001',  name:'Ooredoo',           category:'Télécom',      Icon: Phone,         color:'#ef4444' },
  { code:'TUNTEL001',   name:'Tunisie Telecom',   category:'Télécom',      Icon: Phone,         color:'#10b981' },
  { code:'ORANGE001',   name:'Orange Tunisie',    category:'Télécom',      Icon: Phone,         color:'#f97316' },
  // Streaming & Loisirs
  { code:'NETFLIX001',  name:'Netflix',           category:'Streaming',    Icon: Tv,            color:'#dc2626' },
  { code:'SPOTIFY001',  name:'Spotify',           category:'Musique',      Icon: Music,         color:'#16a34a' },
  { code:'CANAL001',    name:'Canal+',            category:'Streaming',    Icon: Tv,            color:'#1d4ed8' },
  // Assurances & Services
  { code:'STAR001',     name:'STAR Assurances',   category:'Assurance',    Icon: ShoppingBag,   color:'#0891b2' },
  { code:'GAT001',      name:'GAT Assurances',    category:'Assurance',    Icon: ShoppingBag,   color:'#7c3aed' },
  // Transport & Logement
  { code:'TRANSTU001',  name:'Transtu',           category:'Transport',    Icon: Car,           color:'#0284c7' },
  { code:'ONAS001',     name:'ONAS',              category:'Assainissement', Icon: Home,        color:'#65a30d' },
  // Éducation
  { code:'UNIV001',     name:'Frais universitaires', category:'Éducation', Icon: GraduationCap, color:'#9333ea' },
];

const OPERATORS = ['Ooredoo', 'Tunisie Telecom', 'Orange Tunisie'];

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [msg, setMsg] = useState({ text:'', type:'success' });
  const [loading, setLoading] = useState(false);
  const [rechargeForm, setRechargeForm] = useState({ phone:'+216', operator:'Ooredoo', amount:'' });
  const [tab, setTab] = useState('bills');

  useEffect(() => { api.get('/user/bills').then(r => setBills(r.data)); }, []);

  const payBill = async (bill_id) => {
    setLoading(true);
    try {
      const r = await api.post('/user/bills/pay', { bill_id });
      setMsg({ text: r.data.message, type:'success' });
      api.get('/user/bills').then(r => setBills(r.data));
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' });
    } finally { setLoading(false); }
  };

  const handleRecharge = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/user/recharge', rechargeForm);
      setMsg({ text: r.data.message, type:'success' });
      setRechargeForm({ phone:'+216', operator:'Ooredoo', amount:'' });
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' });
    } finally { setLoading(false); }
  };

  const pending = bills.filter(b => b.status === 'pending');
  const paid = bills.filter(b => b.status === 'paid');

  return (
    <Layout title="Factures & Services">
      <div style={s.page}>
        {msg.text && <div style={s.alert(msg.type)}>{msg.type==='success' ? '✓' : '⚠'} {msg.text}</div>}

        <div style={s.tabs}>
          {[['bills','Mes factures'],['recharge','Recharge mobile'],['billers','Payer une facture']].map(([k,l]) => (
            <button key={k} style={{ ...s.tab, ...(tab===k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'bills' && (
          <div>
            {pending.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>En attente ({pending.length})</h3>
                <div style={s.billsGrid}>
                  {pending.map(b => (
                    <div key={b.id} style={s.billCard}>
                      <div style={s.billTop}>
                        {(() => { const bl = BILLERS.find(x => x.code===b.biller_code); return bl ? <div style={{ ...s.billIconWrap, background: bl.color+'15', color: bl.color }}><bl.Icon size={18} strokeWidth={2} /></div> : <div style={{ ...s.billIconWrap, background:'#f0f4ff', color:'#6366f1' }}><Zap size={18} /></div>; })()}
                        <div>
                          <p style={s.billName}>{b.biller_name}</p>
                          <p style={s.billCat}>{b.biller_category}</p>
                        </div>
                        <span style={s.pendingBadge}>En attente</span>
                      </div>
                      <div style={s.billRef}>Réf: {b.reference_number}</div>
                      <div style={s.billBottom}>
                        <div>
                          <p style={s.billAmtLabel}>Montant</p>
                          <p style={s.billAmt}>{parseFloat(b.amount||0).toFixed(3)} TND</p>
                        </div>
                        <button style={s.payBtn} onClick={() => payBill(b.id)} disabled={loading}>
                          {loading ? '...' : 'Payer'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {paid.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Payées</h3>
                {paid.map(b => (
                  <div key={b.id} style={s.paidRow}>
                    {(() => { const bl = BILLERS.find(x => x.code===b.biller_code); return bl ? <div style={{ ...s.paidIconWrap, background: bl.color+'15', color: bl.color }}><bl.Icon size={14} strokeWidth={2} /></div> : <div style={{ ...s.paidIconWrap, background:'#f0f4ff', color:'#6366f1' }}><CheckCircle size={14} /></div>; })()}
                    <span style={s.paidName}>{b.biller_name}</span>
                    <span style={s.paidAmt}>{parseFloat(b.amount||0).toFixed(3)} TND</span>
                    <span style={s.paidDate}>{b.paid_at ? new Date(b.paid_at).toLocaleDateString('fr-TN') : '-'}</span>
                    <span style={s.paidBadge}>✓ Payée</span>
                  </div>
                ))}
              </div>
            )}
            {bills.length === 0 && <p style={s.empty}>Aucune facture</p>}
          </div>
        )}

        {tab === 'recharge' && (
          <div style={s.rechargeCard}>
            <h3 style={s.sectionTitle}>Recharge mobile</h3>
            <form onSubmit={handleRecharge} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Opérateur</label>
                <div style={s.operatorGrid}>
                  {OPERATORS.map(op => (
                    <div key={op} style={{ ...s.operatorCard, ...(rechargeForm.operator===op ? s.operatorActive : {}) }}
                      onClick={() => setRechargeForm({...rechargeForm, operator:op})}>
                      {op}
                    </div>
                  ))}
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Numéro à recharger (+216XXXXXXXX)</label>
                <input style={s.input} value={rechargeForm.phone} onChange={e => setRechargeForm({...rechargeForm, phone:e.target.value})} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Montant (TND)</label>
                <div style={s.amountGrid}>
                  {[5,10,20,30,50].map(a => (
                    <button key={a} type="button" style={{ ...s.amountBtn, ...(parseFloat(rechargeForm.amount)===a ? s.amountBtnActive : {}) }}
                      onClick={() => setRechargeForm({...rechargeForm, amount:a.toString()})}>
                      {a} TND
                    </button>
                  ))}
                </div>
                <input style={s.input} type="number" min="1" step="0.001" placeholder="Autre montant" value={rechargeForm.amount}
                  onChange={e => setRechargeForm({...rechargeForm, amount:e.target.value})} />
              </div>
              <button style={s.btn} type="submit" disabled={loading}>
                <Send size={16} style={{ marginRight:'8px', verticalAlign:'middle' }} />
                {loading ? 'Traitement...' : 'Recharger maintenant'}
              </button>
            </form>
          </div>
        )}

        {tab === 'billers' && (
          <div>
            <p style={s.billerNote}>Sélectionnez un organisme pour payer votre facture</p>
            <div style={s.billersGrid}>
              {BILLERS.map(b => (
                <div key={b.code} style={s.billerCard}>
                  <div style={{ ...s.billerIconWrap, background: b.color + '15', color: b.color }}>
                    <b.Icon size={22} strokeWidth={2} />
                  </div>
                  <p style={s.billerName}>{b.name}</p>
                  <p style={s.billerCat}>{b.category}</p>
                  <button style={s.billerBtn}>Payer</button>
                </div>
              ))}
            </div>
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
  section: { marginBottom:'24px' },
  sectionTitle: { fontSize:'14px', fontWeight:'700', color:'#0f172a', marginBottom:'14px' },
  billsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'14px' },
  billCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', padding:'18px', boxShadow:'0 2px 8px rgba(99,102,241,0.05)' },
  billTop: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' },
  billIconWrap: { width:'38px', height:'38px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  billName: { fontSize:'14px', fontWeight:'700', color:'#0f172a' },
  billCat: { fontSize:'11px', color:'#374151', fontWeight:'600' },
  pendingBadge: { marginLeft:'auto', padding:'3px 8px', background:'#fffbeb', color:'#d97706', borderRadius:'20px', fontSize:'11px', fontWeight:'700', border:'1px solid #fde68a' },
  billRef: { fontSize:'11px', color:'#374151', fontFamily:'monospace', marginBottom:'12px', fontWeight:'500' },
  billBottom: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  billAmtLabel: { fontSize:'11px', color:'#374151', fontWeight:'600' },
  billAmt: { fontSize:'18px', fontWeight:'800', color:'#0f172a' },
  payBtn: { padding:'8px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
  paidRow: { display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'#f8faff', borderRadius:'10px', marginBottom:'6px', border:'1px solid #f0f4ff' },
  paidIconWrap: { width:'28px', height:'28px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  paidName: { flex:1, fontSize:'13px', color:'#1e293b', fontWeight:'600' },
  paidAmt: { fontSize:'13px', color:'#0f172a', fontWeight:'700' },
  paidDate: { fontSize:'11px', color:'#374151', fontWeight:'500' },
  paidBadge: { padding:'3px 8px', background:'#f0fdf4', color:'#15803d', borderRadius:'20px', fontSize:'11px', fontWeight:'700', border:'1px solid #bbf7d0' },
  empty: { color:'#374151', textAlign:'center', padding:'40px', fontSize:'13px', fontWeight:'500' },
  rechargeCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'20px', padding:'24px', maxWidth:'480px', boxShadow:'0 2px 16px rgba(99,102,241,0.06)' },
  form: { display:'flex', flexDirection:'column', gap:'16px' },
  field: { display:'flex', flexDirection:'column', gap:'8px' },
  label: { fontSize:'12px', fontWeight:'700', color:'#374151' },
  input: { padding:'11px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500' },
  operatorGrid: { display:'flex', gap:'8px' },
  operatorCard: { flex:1, padding:'10px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'10px', textAlign:'center', fontSize:'12px', color:'#374151', cursor:'pointer', fontWeight:'600' },
  operatorActive: { background:'#f5f3ff', border:'2px solid #6366f1', color:'#6366f1', fontWeight:'700' },
  amountGrid: { display:'flex', gap:'8px', flexWrap:'wrap' },
  amountBtn: { padding:'7px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'8px', color:'#374151', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  amountBtnActive: { background:'#f5f3ff', border:'2px solid #6366f1', color:'#6366f1', fontWeight:'700' },
  btn: { padding:'13px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 16px rgba(99,102,241,0.3)' },
  billerNote: { color:'#374151', fontSize:'13px', marginBottom:'16px', fontWeight:'500' },
  billersGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'14px' },
  billerCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', padding:'20px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', boxShadow:'0 2px 8px rgba(99,102,241,0.05)' },
  billerIconWrap: { width:'48px', height:'48px', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center' },
  billerName: { fontSize:'13px', fontWeight:'700', color:'#0f172a' },
  billerCat: { fontSize:'11px', color:'#374151', fontWeight:'600' },
  billerBtn: { padding:'7px 16px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:'8px', color:'#6366f1', fontSize:'12px', fontWeight:'700', cursor:'pointer' },
};
