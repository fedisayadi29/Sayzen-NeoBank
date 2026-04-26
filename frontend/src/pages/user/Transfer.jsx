import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Zap, Globe, Building2, Send } from 'lucide-react';

const TRANSFER_TYPES = [
  { value:'transfer_internal',   label:'Virement interne Sayzen',    desc:'Instantané · Gratuit',       Icon: Zap },
  { value:'transfer_interbank',  label:'Virement interbancaire',     desc:'1-2 jours · Frais 0.5%',     Icon: Building2 },
  { value:'transfer_swift',      label:'Virement international SWIFT',desc:'2-5 jours · Frais variables', Icon: Globe },
];

export default function Transfer() {
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({ to_rib:'', to_iban:'', amount:'', description:'', type:'transfer_internal' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('new');
  const [newBenef, setNewBenef] = useState({ name:'', bank_name:'', rib:'', phone:'' });
  const [benefMsg, setBenefMsg] = useState('');

  useEffect(() => {
    api.get('/user/accounts').then(r => setAccounts(r.data));
    api.get('/user/beneficiaries').then(r => setBeneficiaries(r.data));
  }, []);

  const balance = accounts[0] ? parseFloat(accounts[0].available_balance) : 0;

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (!payload.to_rib && !payload.to_iban) { setError('RIB ou IBAN requis'); setLoading(false); return; }
      const r = await api.post('/user/transfer', payload);
      setSuccess(r.data.message);
      setForm({ to_rib:'', to_iban:'', amount:'', description:'', type:'transfer_internal' });
      api.get('/user/accounts').then(r => setAccounts(r.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du virement');
    } finally { setLoading(false); }
  };

  const handleAddBenef = async (e) => {
    e.preventDefault();
    try {
      await api.post('/user/beneficiaries', newBenef);
      setBenefMsg('Bénéficiaire ajouté');
      setNewBenef({ name:'', bank_name:'', rib:'', phone:'' });
      api.get('/user/beneficiaries').then(r => setBeneficiaries(r.data));
    } catch (err) { setBenefMsg(err.response?.data?.message || 'Erreur'); }
  };

  const deleteBenef = async (id) => {
    await api.delete(`/user/beneficiaries/${id}`);
    setBeneficiaries(beneficiaries.filter(b => b.id !== id));
  };

  const selectBenef = (b) => {
    setForm({ ...form, to_rib: b.rib||'', to_iban: b.iban||'' });
    setTab('new');
  };

  return (
    <Layout title="Virements">
      <div style={s.page}>
        <div style={s.grid}>
          {/* Left: Transfer Form */}
          <div>
            {/* Balance */}
            <div style={s.balCard}>
              <div>
                <p style={s.balLabel}>Solde disponible</p>
                <p style={s.balAmt}>{balance.toLocaleString('fr-TN', { minimumFractionDigits:3 })} <span style={s.balCur}>TND</span></p>
                {accounts[0] && (
                  <div style={s.ribIbanBlock}>
                    <div style={s.ribRow}>
                      <span style={s.ribLabel}>RIB</span>
                      <span style={s.ribVal}>{accounts[0].rib}</span>
                      <button style={s.copyBtnWhite} onClick={() => navigator.clipboard.writeText(accounts[0].rib)} title="Copier">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      </button>
                    </div>
                    <div style={s.ribRow}>
                      <span style={s.ribLabel}>IBAN</span>
                      <span style={s.ribVal}>{accounts[0].iban}</span>
                      <button style={s.copyBtnWhite} onClick={() => navigator.clipboard.writeText(accounts[0].iban)} title="Copier">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div style={s.balIcon}><Send size={32} color="rgba(255,255,255,0.3)" strokeWidth={1.5} /></div>
            </div>

            {/* Tabs */}
            <div style={s.tabs}>
              {[['new','Nouveau virement'],['benef','Bénéficiaires']].map(([k,l]) => (
                <button key={k} style={{ ...s.tab, ...(tab===k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            {tab === 'new' && (
              <div style={s.card}>
                {success && <div style={s.success}>✓ {success}</div>}
                {error && <div style={s.error}>⚠ {error}</div>}

                <form onSubmit={handleTransfer} style={s.form}>
                  <div style={s.field}>
                    <label style={s.label}>Type de virement</label>
                    <div style={s.typeGrid}>
                      {TRANSFER_TYPES.map(t => (
                        <div key={t.value} style={{ ...s.typeCard, ...(form.type===t.value ? s.typeCardActive : {}) }}
                          onClick={() => setForm({...form, type:t.value})}>
                          <t.Icon size={18} color={form.type===t.value ? '#6366f1' : '#64748b'} strokeWidth={2} />
                          <div>
                            <p style={s.typeLabel}>{t.label}</p>
                            <p style={s.typeDesc}>{t.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>RIB destinataire</label>
                    <input style={s.input} placeholder="10006000010XXXXXXXXXXX47" value={form.to_rib}
                      onChange={e => setForm({...form, to_rib:e.target.value})} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>ou IBAN</label>
                    <input style={s.input} placeholder="TN59..." value={form.to_iban}
                      onChange={e => setForm({...form, to_iban:e.target.value})} />
                  </div>
                  <div style={s.row}>
                    <div style={s.field}>
                      <label style={s.label}>Montant (TND) *</label>
                      <input style={s.input} type="number" min="0.001" step="0.001" max={balance}
                        placeholder="0.000" value={form.amount}
                        onChange={e => setForm({...form, amount:e.target.value})} required />
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Motif</label>
                    <input style={s.input} placeholder="Loyer, remboursement..." value={form.description}
                      onChange={e => setForm({...form, description:e.target.value})} />
                  </div>
                  <button style={s.btn} type="submit" disabled={loading || !form.amount || parseFloat(form.amount) > balance}>
                    <Send size={16} style={{ marginRight:'8px', verticalAlign:'middle' }} />
                    {loading ? 'Traitement...' : 'Envoyer le virement'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'benef' && (
              <div style={s.card}>
                {benefMsg && <div style={s.success}>{benefMsg}</div>}
                <h4 style={s.subTitle}>Mes bénéficiaires</h4>
                {beneficiaries.length === 0
                  ? <p style={s.empty}>Aucun bénéficiaire enregistré</p>
                  : beneficiaries.map(b => (
                    <div key={b.id} style={s.benefRow}>
                      <div style={s.benefAvatar}>{b.name[0]}</div>
                      <div style={s.benefInfo}>
                        <p style={s.benefName}>{b.name}</p>
                        <p style={s.benefRib}>{b.rib || b.iban || b.phone}</p>
                      </div>
                      <div style={s.benefActions}>
                        <button style={s.btnSelect} onClick={() => selectBenef(b)}>Sélectionner</button>
                        <button style={s.btnDel} onClick={() => deleteBenef(b.id)}>✕</button>
                      </div>
                    </div>
                  ))
                }
                <h4 style={{ ...s.subTitle, marginTop:'20px' }}>Ajouter un bénéficiaire</h4>
                <form onSubmit={handleAddBenef} style={s.form}>
                  <div style={s.row}>
                    <div style={s.field}><label style={s.label}>Nom *</label><input style={s.input} value={newBenef.name} onChange={e => setNewBenef({...newBenef, name:e.target.value})} required /></div>
                    <div style={s.field}><label style={s.label}>Banque</label><input style={s.input} value={newBenef.bank_name} onChange={e => setNewBenef({...newBenef, bank_name:e.target.value})} /></div>
                  </div>
                  <div style={s.row}>
                    <div style={s.field}><label style={s.label}>RIB</label><input style={s.input} value={newBenef.rib} onChange={e => setNewBenef({...newBenef, rib:e.target.value})} /></div>
                    <div style={s.field}><label style={s.label}>Téléphone</label><input style={s.input} placeholder="+216..." value={newBenef.phone} onChange={e => setNewBenef({...newBenef, phone:e.target.value})} /></div>
                  </div>
                  <button style={s.btn} type="submit">+ Ajouter</button>
                </form>
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div style={s.infoCol}>
            <div style={s.infoCard}>
              <h4 style={s.infoTitle}>🇹🇳 Informations bancaires</h4>
              <div style={s.infoList}>
                <div style={s.infoItem}><span style={s.infoLabel}>Code banque</span><span style={s.infoVal}>10006</span></div>
                <div style={s.infoItem}><span style={s.infoLabel}>Code guichet</span><span style={s.infoVal}>00001</span></div>
                <div style={s.infoItem}><span style={s.infoLabel}>Devise</span><span style={s.infoVal}>TND (Dinar Tunisien)</span></div>
                <div style={s.infoItem}><span style={s.infoLabel}>SWIFT/BIC</span><span style={s.infoVal}>SAYZTNTT</span></div>
              </div>
            </div>
            <div style={s.infoCard}>
              <h4 style={s.infoTitle}>⏱ Délais de traitement</h4>
              <div style={s.infoList}>
                <div style={s.infoItem}><span style={s.infoLabel}>Interne</span><span style={{ ...s.infoVal, color:'#10b981' }}>Instantané</span></div>
                <div style={s.infoItem}><span style={s.infoLabel}>Interbancaire</span><span style={s.infoVal}>1-2 jours ouvrés</span></div>
                <div style={s.infoItem}><span style={s.infoLabel}>SWIFT</span><span style={s.infoVal}>2-5 jours ouvrés</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1000px' },
  grid: { display:'grid', gridTemplateColumns:'1fr 280px', gap:'20px' },
  balCard: { background:'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)', borderRadius:'20px', padding:'24px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 12px 40px rgba(99,102,241,0.3)', backgroundSize:'200% 200%', animation:'gradientShift 6s ease infinite' },
  balLabel: { color:'rgba(255,255,255,0.75)', fontSize:'12px', marginBottom:'6px' },
  balAmt: { fontSize:'30px', fontWeight:'800', color:'#fff', marginBottom:'6px' },
  balCur: { fontSize:'14px', fontWeight:'400' },
  balRib: { fontSize:'11px', color:'rgba(255,255,255,0.5)', fontFamily:'monospace' },
  ribIbanBlock: { display:'flex', flexDirection:'column', gap:'4px', marginTop:'6px' },
  ribRow: { display:'flex', alignItems:'center', gap:'6px' },
  ribLabel: { fontSize:'10px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'1px', minWidth:'30px', fontWeight:'600' },
  ribVal: { fontSize:'11px', color:'rgba(255,255,255,0.85)', fontFamily:'monospace', fontWeight:'600' },
  copyBtnWhite: { background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'4px', padding:'2px 5px', cursor:'pointer', color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', flexShrink:0 },
  balIcon: { fontSize:'40px', opacity:0.5 },
  tabs: { display:'flex', gap:'4px', marginBottom:'16px', background:'#f0f4ff', padding:'4px', borderRadius:'12px' },
  tab: { flex:1, padding:'9px', background:'none', border:'none', color:'#374151', fontSize:'13px', fontWeight:'600', borderRadius:'10px', cursor:'pointer' },
  tabActive: { background:'#fff', color:'#6366f1', fontWeight:'700', boxShadow:'0 2px 8px rgba(99,102,241,0.1)' },
  card: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  success: { background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', padding:'12px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'500' },
  error: { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'12px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'500' },
  form: { display:'flex', flexDirection:'column', gap:'14px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#374151' },
  input: { padding:'11px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', color:'#1e293b', fontSize:'13px', outline:'none', transition:'border 0.2s' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  typeGrid: { display:'flex', flexDirection:'column', gap:'8px' },
  typeCard: { display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', cursor:'pointer', transition:'all 0.2s' },
  typeCardActive: { background:'#f5f3ff', border:'2px solid #6366f1' },
  typeIcon: { fontSize:'20px' },
  typeLabel: { fontSize:'13px', color:'#1e293b', fontWeight:'600' },
  typeDesc: { fontSize:'11px', color:'#374151', fontWeight:'500' },
  btn: { padding:'13px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', boxShadow:'0 4px 16px rgba(99,102,241,0.3)', cursor:'pointer' },
  subTitle: { fontSize:'14px', fontWeight:'700', color:'#1e293b', marginBottom:'12px' },
  empty: { color:'#374151', fontSize:'13px', textAlign:'center', padding:'16px 0', fontWeight:'500' },
  benefRow: { display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:'1px solid #f8faff' },
  benefAvatar: { width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:'#fff', flexShrink:0 },
  benefInfo: { flex:1 },
  benefName: { fontSize:'13px', color:'#1e293b', fontWeight:'600' },
  benefRib: { fontSize:'11px', color:'#374151', fontFamily:'monospace', fontWeight:'500' },
  benefActions: { display:'flex', gap:'6px' },
  btnSelect: { padding:'5px 10px', background:'#f5f3ff', border:'none', borderRadius:'8px', color:'#6366f1', fontSize:'11px', fontWeight:'700', cursor:'pointer' },
  btnDel: { padding:'5px 8px', background:'#fef2f2', border:'none', borderRadius:'8px', color:'#ef4444', fontSize:'12px', cursor:'pointer' },
  infoCol: { display:'flex', flexDirection:'column', gap:'16px' },
  infoCard: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'16px', padding:'18px', boxShadow:'0 2px 8px rgba(99,102,241,0.05)' },
  infoTitle: { fontSize:'13px', fontWeight:'700', color:'#1e293b', marginBottom:'14px' },
  infoList: { display:'flex', flexDirection:'column', gap:'8px' },
  infoItem: { display:'flex', justifyContent:'space-between' },
  infoLabel: { fontSize:'12px', color:'#374151', fontWeight:'600' },
  infoVal: { fontSize:'12px', color:'#1e293b', fontWeight:'600' },
};
