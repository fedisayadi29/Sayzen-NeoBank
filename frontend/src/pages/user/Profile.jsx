import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Save, Lock, Clock, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const GOVERNORATES = ['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan'];

const STATUS_ICON = {
  pending:  <Clock size={14} color="#d97706" />,
  approved: <CheckCircle size={14} color="#15803d" />,
  rejected: <XCircle size={14} color="#dc2626" />,
};
const STATUS_LABEL = { pending:'En attente', approved:'Approuvé', rejected:'Refusé' };
const STATUS_COLOR = { pending:'#fffbeb', approved:'#f0fdf4', rejected:'#fef2f2' };
const STATUS_BORDER = { pending:'#fde68a', approved:'#bbf7d0', rejected:'#fecaca' };

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name||'', last_name: user?.last_name||'',
    phone: user?.phone||'', address: user?.address||'',
    city: user?.city||'', governorate: user?.governorate||'',
    postal_code: user?.postal_code||'', preferred_language: user?.preferred_language||'fr'
  });
  const [pwdForm, setPwdForm] = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [msg, setMsg] = useState({ text:'', type:'success' });
  const [tab, setTab] = useState('info');
  const [changeRequests, setChangeRequests] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [phoneError, setPhoneError] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/user/profile/change-requests').then(r => setChangeRequests(r.data)).catch(() => {}),
      api.get('/user/accounts').then(r => setAccounts(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const primaryAccount = accounts.find(acc => acc.account_type === 'current') || accounts[0];

  const validatePhone = (val) => {
    if (!val) { setPhoneError(''); return true; }
    if (!/^\+216/.test(val)) { setPhoneError('Doit commencer par +216'); return false; }
    const digits = val.replace('+216','');
    if (digits.length !== 8) { setPhoneError(`8 chiffres requis après +216 (actuellement ${digits.length})`); return false; }
    if (!/^[0-9]{8}$/.test(digits)) { setPhoneError('Chiffres uniquement après +216'); return false; }
    setPhoneError('');
    return true;
  };

  const handleProfile = async (e) => {
    e.preventDefault();
    if (!validatePhone(form.phone)) return;
    try {
      const r = await api.put('/user/profile', form);
      if (r.data.pending_approval) {
        setMsg({ text: r.data.message, type:'warning' });
        api.get('/user/profile/change-requests').then(r => setChangeRequests(r.data));
      } else {
        setMsg({ text:'Profil mis à jour avec succès', type:'success' });
        refreshUser();
      }
    } catch (err) { setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' }); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) { setMsg({ text:'Les mots de passe ne correspondent pas', type:'error' }); return; }
    if (pwdForm.new_password.length < 8) { setMsg({ text:'Mot de passe trop court (min. 8 caractères)', type:'error' }); return; }
    try {
      await api.put('/auth/change-password', { current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      setMsg({ text:'Mot de passe modifié avec succès', type:'success' });
      setPwdForm({ current_password:'', new_password:'', confirm_password:'' });
    } catch (err) { setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' }); }
  };

  const kycColors = { verified:'#10b981', pending:'#f59e0b', in_review:'#3b82f6', rejected:'#ef4444' };
  const riskColors = { low:'#10b981', medium:'#f59e0b', high:'#ef4444', critical:'#dc2626' };
  const pendingCount = changeRequests.filter(r => r.status === 'pending').length;

  return (
    <Layout title="Mon profil">
      <div style={s.page}>
        {msg.text && (
          <div style={s.alert(msg.type)} className="animate-slideDown">
            {msg.type === 'warning' ? <AlertCircle size={16} style={{ marginRight:'8px', flexShrink:0 }} /> :
             msg.type === 'success' ? <CheckCircle size={16} style={{ marginRight:'8px', flexShrink:0 }} /> :
             <XCircle size={16} style={{ marginRight:'8px', flexShrink:0 }} />}
            {msg.text}
          </div>
        )}

        <div style={s.layout}>
          {/* Profile Card */}
          <div style={s.profileCard}>
            <div style={s.avatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
            <h3 style={s.name}>{user?.first_name} {user?.last_name}</h3>
            <p style={s.email}>{user?.email}</p>
            <p style={s.phone}>{user?.phone}</p>
            <div style={s.badges}>
              <span style={{ ...s.badge, background: kycColors[user?.kyc_status]+'18', color: kycColors[user?.kyc_status] }}>
                {user?.kyc_status === 'verified' ? 'KYC Vérifié' : user?.kyc_status === 'in_review' ? 'En révision' : 'KYC en attente'}
              </span>
              <span style={{ ...s.badge, background: riskColors[user?.risk_level]+'18', color: riskColors[user?.risk_level] }}>
                Risque: {user?.risk_level}
              </span>
            </div>
            <div style={s.scoreCard}>
              <p style={s.scoreLabel}>Score de crédit</p>
              <p style={s.scoreVal}>{user?.credit_score}</p>
              <div style={s.scoreBar}><div style={{ ...s.scoreFill, width:`${(user?.credit_score/850)*100}%` }} /></div>
              <p style={s.scoreRange}>0 — 850</p>
            </div>
            <div style={s.infoList}>
              {[
                ['CIN', user?.cin || '-'],
                ['Ville', user?.city || '-'],
                ['Gouvernorat', user?.governorate || '-'],
                ['Membre depuis', user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-TN') : '-'],
                ['Dernière connexion', user?.last_login ? new Date(user.last_login).toLocaleDateString('fr-TN') : '-'],
              ].map(([l,v]) => (
                <div key={l} style={s.infoRow}><span style={s.infoLabel}>{l}</span><span style={s.infoVal}>{v}</span></div>
              ))}

              {/* RIB / IBAN with copy */}
              {(primaryAccount?.rib || primaryAccount?.iban) && (
                <div style={s.ribIbanSection}>
                  {primaryAccount?.rib && (
                    <div style={s.ribIbanRow}>
                      <span style={s.infoLabel}>RIB</span>
                      <div style={s.ribIbanVal}>
                        <span style={s.ribIbanText}>{primaryAccount.rib}</span>
                        <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(primaryAccount.rib)} title="Copier">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {primaryAccount?.iban && (
                    <div style={s.ribIbanRow}>
                      <span style={s.infoLabel}>IBAN</span>
                      <div style={s.ribIbanVal}>
                        <span style={s.ribIbanText}>{primaryAccount.iban}</span>
                        <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(primaryAccount.iban)} title="Copier">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div style={s.right}>
            <div style={s.tabs}>
              {[
                ['info','Informations'],
                ['security','Sécurité'],
                ['requests', `Demandes${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
              ].map(([k,l]) => (
                <button key={k} style={{ ...s.tab, ...(tab===k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            {tab === 'info' && (
              <div style={s.formCard}>
                <div style={s.infoNotice}>
                  <Info size={14} color="#2563eb" style={{ flexShrink:0 }} />
                  <span>Les modifications de téléphone, adresse et gouvernorat nécessitent une validation par l'administrateur.</span>
                </div>
                <form onSubmit={handleProfile} style={s.form}>
                  <div style={s.row}>
                    <div style={s.field}><label style={s.label}>Prénom</label><input style={s.input} value={form.first_name} onChange={e => setForm({...form, first_name:e.target.value})} /></div>
                    <div style={s.field}><label style={s.label}>Nom</label><input style={s.input} value={form.last_name} onChange={e => setForm({...form, last_name:e.target.value})} /></div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Téléphone (+216 + 8 chiffres)</label>
                    <input style={{ ...s.input, ...(phoneError ? s.inputError : {}) }}
                      value={form.phone}
                      onChange={e => { setForm({...form, phone:e.target.value}); validatePhone(e.target.value); }}
                      placeholder="+21698765432" />
                    {phoneError && <span style={s.fieldError}>{phoneError}</span>}
                    {!phoneError && form.phone && <span style={s.fieldOk}>Format valide</span>}
                  </div>
                  <div style={s.field}><label style={s.label}>Adresse</label><input style={s.input} value={form.address} onChange={e => setForm({...form, address:e.target.value})} /></div>
                  <div style={s.row}>
                    <div style={s.field}><label style={s.label}>Ville</label><input style={s.input} value={form.city} onChange={e => setForm({...form, city:e.target.value})} /></div>
                    <div style={s.field}>
                      <label style={s.label}>Gouvernorat</label>
                      <select style={s.input} value={form.governorate} onChange={e => setForm({...form, governorate:e.target.value})}>
                        <option value="">Sélectionner</option>
                        {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={s.row}>
                    <div style={s.field}><label style={s.label}>Code postal</label><input style={s.input} value={form.postal_code} onChange={e => setForm({...form, postal_code:e.target.value})} /></div>
                    <div style={s.field}>
                      <label style={s.label}>Langue</label>
                      <select style={s.input} value={form.preferred_language} onChange={e => setForm({...form, preferred_language:e.target.value})}>
                        <option value="fr">Français</option>
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                  <button style={s.btn} type="submit">
                    <Save size={16} style={{ marginRight:'8px', verticalAlign:'middle' }} />Sauvegarder
                  </button>
                </form>
              </div>
            )}

            {tab === 'security' && (
              <div style={s.formCard}>
                <h4 style={s.secTitle}>Changer le mot de passe</h4>
                <form onSubmit={handlePassword} style={s.form}>
                  <div style={s.field}><label style={s.label}>Mot de passe actuel</label><input style={s.input} type="password" value={pwdForm.current_password} onChange={e => setPwdForm({...pwdForm, current_password:e.target.value})} required /></div>
                  <div style={s.field}><label style={s.label}>Nouveau mot de passe (min. 8 caractères)</label><input style={s.input} type="password" value={pwdForm.new_password} onChange={e => setPwdForm({...pwdForm, new_password:e.target.value})} required minLength={8} /></div>
                  <div style={s.field}><label style={s.label}>Confirmer</label><input style={s.input} type="password" value={pwdForm.confirm_password} onChange={e => setPwdForm({...pwdForm, confirm_password:e.target.value})} required /></div>
                  <button style={s.btn} type="submit">
                    <Lock size={16} style={{ marginRight:'8px', verticalAlign:'middle' }} />Modifier le mot de passe
                  </button>
                </form>
                <div style={s.secInfo}>
                  <h4 style={s.secTitle}>Informations de sécurité</h4>
                  <div style={s.secRow}><span style={s.secLabel}>Authentification 2FA</span><span style={s.secVal}>{user?.two_fa_enabled ? 'Activée' : 'Désactivée'}</span></div>
                  <div style={s.secRow}><span style={s.secLabel}>Compte verrouillé</span><span style={{ ...s.secVal, color: user?.is_locked ? '#dc2626' : '#15803d' }}>{user?.is_locked ? 'Oui' : 'Non'}</span></div>
                  <div style={s.secRow}><span style={s.secLabel}>Statut du compte</span><span style={{ ...s.secVal, color: user?.is_active ? '#15803d' : '#dc2626' }}>{user?.is_active ? 'Actif' : 'Suspendu'}</span></div>
                </div>
              </div>
            )}

            {tab === 'requests' && (
              <div style={s.formCard}>
                <h4 style={s.secTitle}>Demandes de modification</h4>
                {changeRequests.length === 0 ? (
                  <p style={s.empty}>Aucune demande de modification</p>
                ) : (
                  <div style={s.requestsList}>
                    {changeRequests.map(r => (
                      <div key={r.id} style={{ ...s.requestCard, background: STATUS_COLOR[r.status], border:`1px solid ${STATUS_BORDER[r.status]}` }}>
                        <div style={s.requestHeader}>
                          <div style={s.requestField}>
                            {STATUS_ICON[r.status]}
                            <span style={s.requestFieldName}>{r.field_label}</span>
                          </div>
                          <span style={{ ...s.requestStatus, color: r.status==='pending' ? '#d97706' : r.status==='approved' ? '#15803d' : '#dc2626' }}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </div>
                        <div style={s.requestValues}>
                          <div style={s.requestValue}>
                            <span style={s.requestValueLabel}>Ancienne valeur</span>
                            <span style={s.requestValueText}>{r.old_value || '—'}</span>
                          </div>
                          <div style={s.requestArrow}>→</div>
                          <div style={s.requestValue}>
                            <span style={s.requestValueLabel}>Nouvelle valeur</span>
                            <span style={{ ...s.requestValueText, fontWeight:'700' }}>{r.new_value}</span>
                          </div>
                        </div>
                        {r.admin_note && (
                          <p style={s.adminNote}>Note admin: {r.admin_note}</p>
                        )}
                        <p style={s.requestDate}>{new Date(r.created_at).toLocaleDateString('fr-TN', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1000px' },
  alert: (type) => ({ background: type==='success' ? '#f0fdf4' : type==='warning' ? '#fffbeb' : '#fef2f2', border:`1px solid ${type==='success' ? '#bbf7d0' : type==='warning' ? '#fde68a' : '#fecaca'}`, color: type==='success' ? '#15803d' : type==='warning' ? '#92400e' : '#dc2626', padding:'12px 16px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'500', display:'flex', alignItems:'center' }),
  layout: { display:'grid', gridTemplateColumns:'260px 1fr', gap:'20px' },
  profileCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'20px', padding:'24px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', height:'fit-content', boxShadow:'0 2px 16px rgba(99,102,241,0.06)' },
  avatar: { width:'72px', height:'72px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', fontWeight:'800', color:'#fff', marginBottom:'12px' },
  name: { fontSize:'17px', fontWeight:'800', color:'#0f172a', marginBottom:'4px' },
  email: { fontSize:'12px', color:'#374151', marginBottom:'2px', fontWeight:'500' },
  phone: { fontSize:'12px', color:'#374151', marginBottom:'12px', fontWeight:'500' },
  badges: { display:'flex', flexDirection:'column', gap:'6px', marginBottom:'16px', width:'100%' },
  badge: { padding:'5px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' },
  scoreCard: { width:'100%', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:'12px', padding:'14px', marginBottom:'16px' },
  scoreLabel: { fontSize:'11px', color:'#374151', marginBottom:'4px', fontWeight:'600' },
  scoreVal: { fontSize:'28px', fontWeight:'800', color:'#6366f1', marginBottom:'8px' },
  scoreBar: { height:'6px', background:'#e8edf8', borderRadius:'3px', marginBottom:'4px', overflow:'hidden' },
  scoreFill: { height:'100%', background:'linear-gradient(90deg,#ef4444,#f59e0b,#10b981)', borderRadius:'3px' },
  scoreRange: { fontSize:'10px', color:'#374151', fontWeight:'500' },
  infoList: { width:'100%', display:'flex', flexDirection:'column', gap:'6px' },
  infoRow: { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f0f4ff' },
  infoLabel: { fontSize:'11px', color:'#374151', fontWeight:'600' },
  infoVal: { fontSize:'11px', color:'#0f172a', fontWeight:'700' },
  ribIbanSection: { marginTop:'8px', display:'flex', flexDirection:'column', gap:'6px', background:'#f5f3ff', borderRadius:'10px', padding:'10px 12px', border:'1px solid #ddd6fe' },
  ribIbanRow: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  ribIbanVal: { display:'flex', alignItems:'center', gap:'6px' },
  ribIbanText: { fontSize:'10px', color:'#4338ca', fontFamily:'monospace', fontWeight:'700', letterSpacing:'0.3px' },
  copyBtn: { background:'#ede9fe', border:'none', borderRadius:'4px', padding:'3px 6px', cursor:'pointer', color:'#6366f1', display:'flex', alignItems:'center' },
  right: {},
  tabs: { display:'flex', gap:'4px', marginBottom:'16px', background:'#f0f4ff', padding:'4px', borderRadius:'12px' },
  tab: { flex:1, padding:'9px', background:'none', border:'none', color:'#374151', fontSize:'13px', fontWeight:'600', borderRadius:'10px', cursor:'pointer' },
  tabActive: { background:'#fff', color:'#6366f1', fontWeight:'700', boxShadow:'0 2px 8px rgba(99,102,241,0.1)' },
  formCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'20px', padding:'24px', boxShadow:'0 2px 16px rgba(99,102,241,0.06)' },
  infoNotice: { display:'flex', alignItems:'flex-start', gap:'8px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'10px 14px', marginBottom:'16px', fontSize:'12px', color:'#1d4ed8', fontWeight:'500' },
  form: { display:'flex', flexDirection:'column', gap:'14px' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'700', color:'#374151' },
  input: { padding:'11px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500' },
  inputError: { border:'2px solid #fca5a5', background:'#fef2f2' },
  fieldError: { fontSize:'11px', color:'#dc2626', fontWeight:'600' },
  fieldOk: { fontSize:'11px', color:'#15803d', fontWeight:'600' },
  btn: { padding:'13px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 16px rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center' },
  secTitle: { fontSize:'14px', fontWeight:'700', color:'#0f172a', marginBottom:'14px' },
  secInfo: { marginTop:'24px', paddingTop:'20px', borderTop:'1px solid #f0f4ff' },
  secRow: { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f0f4ff' },
  secLabel: { fontSize:'13px', color:'#374151', fontWeight:'600' },
  secVal: { fontSize:'13px', color:'#0f172a', fontWeight:'700' },
  empty: { color:'#374151', textAlign:'center', padding:'30px', fontSize:'13px' },
  requestsList: { display:'flex', flexDirection:'column', gap:'12px' },
  requestCard: { borderRadius:'12px', padding:'14px' },
  requestHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' },
  requestField: { display:'flex', alignItems:'center', gap:'6px' },
  requestFieldName: { fontSize:'13px', fontWeight:'700', color:'#0f172a' },
  requestStatus: { fontSize:'12px', fontWeight:'700' },
  requestValues: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' },
  requestValue: { flex:1, background:'rgba(255,255,255,0.7)', borderRadius:'8px', padding:'8px 10px' },
  requestArrow: { fontSize:'16px', color:'#6366f1', fontWeight:'700' },
  requestValueLabel: { display:'block', fontSize:'10px', color:'#64748b', fontWeight:'600', marginBottom:'2px', textTransform:'uppercase' },
  requestValueText: { fontSize:'12px', color:'#0f172a' },
  adminNote: { fontSize:'12px', color:'#374151', fontStyle:'italic', marginBottom:'6px', padding:'6px 10px', background:'rgba(255,255,255,0.5)', borderRadius:'6px' },
  requestDate: { fontSize:'11px', color:'#64748b' },
};
