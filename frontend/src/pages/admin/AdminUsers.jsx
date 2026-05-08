import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Eye, DollarSign, PauseCircle, PlayCircle, Lock, Unlock, Search, CheckCircle, XCircle } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [depositModal, setDepositModal] = useState(null);
  const [depositForm, setDepositForm] = useState({ amount:'', description:'' });
  const [msg, setMsg] = useState({ text:'', type:'success' });
  const [depositError, setDepositError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api.get(`/admin/users?search=${search}&kyc_status=${kycFilter}`)
      .then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [search, kycFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStatus = async (id) => {
    try { await api.patch(`/admin/users/${id}/toggle`); fetchUsers(); setMsg({ text:'Statut mis à jour', type:'success' }); }
    catch (err) { setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' }); }
  };

  const toggleLock = async (id) => {
    try { await api.patch(`/admin/users/${id}/lock`); fetchUsers(); setMsg({ text:'Verrouillage mis à jour', type:'success' }); }
    catch (err) { setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' }); }
  };

  const updateKyc = async (id, status) => {
    try { await api.patch(`/admin/users/${id}/kyc`, { kyc_status: status }); fetchUsers(); }
    catch (err) { setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' }); }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setDepositError('');
    const amount = parseFloat(depositForm.amount);
    if (!depositForm.amount || isNaN(amount) || amount <= 0) {
      setDepositError('Veuillez saisir un montant valide supérieur à 0');
      return;
    }
    try {
      await api.post('/admin/deposit', {
        user_id: depositModal,
        amount: amount,
        description: depositForm.description || 'Dépôt administrateur'
      });
      setMsg({ text: `Dépôt de ${amount.toFixed(3)} TND effectué avec succès`, type:'success' });
      setDepositModal(null);
      setDepositForm({ amount:'', description:'' });
      fetchUsers();
    } catch (err) {
      setDepositError(err.response?.data?.message || 'Erreur lors du dépôt');
    }
  };

  const kycColors = { verified:'#10b981', pending:'#f59e0b', in_review:'#3b82f6', rejected:'#ef4444' };
  const riskColors = { low:'#10b981', medium:'#f59e0b', high:'#ef4444', critical:'#dc2626' };

  const selectedUser = users.find(u => u.id === depositModal);

  return (
    <Layout title="Gestion des clients">
      <div style={s.page}>
        <div style={s.toolbar}>
          <div style={s.searchWrap}>
            <Search size={16} color="#94a3b8" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)' }} />
            <input style={s.search} placeholder="Nom, email, CIN, téléphone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={s.filter} value={kycFilter} onChange={e => setKycFilter(e.target.value)}>
            <option value="">Tous les KYC</option>
            <option value="pending">En attente</option>
            <option value="in_review">En révision</option>
            <option value="verified">Vérifiés</option>
            <option value="rejected">Rejetés</option>
          </select>
          <span style={s.count}>{users.length} client(s)</span>
        </div>

        {msg.text && (
          <div style={s.msgBox(msg.type)} className="animate-slideDown">
            {msg.type === 'success' ? <CheckCircle size={14} style={{ marginRight:'8px' }} /> : <XCircle size={14} style={{ marginRight:'8px' }} />}
            {msg.text}
          </div>
        )}

        <div style={s.card}>
          {loading ? <p style={s.loading}>Chargement...</p> : (
            <table style={s.table}>
              <thead>
                <tr>{['Client','Contact','Solde','KYC','Risque','Statut','Inscrit','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.userCell}>
                        <div style={s.avatar}>{u.first_name[0]}{u.last_name[0]}</div>
                        <div>
                          <p style={s.userName}>{u.first_name} {u.last_name}</p>
                          <p style={s.userCin}>{u.cin || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      <p style={s.contactEmail}>{u.email}</p>
                      <p style={s.contactPhone}>{u.phone}</p>
                    </td>
                    <td style={{ ...s.td, color:'#15803d', fontWeight:'800' }}>
                      {parseFloat(u.total_balance).toLocaleString('fr-TN', { minimumFractionDigits:3 })} TND
                    </td>
                    <td style={s.td}>
                      <select
                        style={{ ...s.kycSelect, color:kycColors[u.kyc_status], background:kycColors[u.kyc_status]+'15' }}
                        value={u.kyc_status}
                        onChange={e => updateKyc(u.id, e.target.value)}>
                        <option value="pending">En attente</option>
                        <option value="in_review">En révision</option>
                        <option value="verified">Vérifié</option>
                        <option value="rejected">Rejeté</option>
                      </select>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.riskBadge, color:riskColors[u.risk_level], background:riskColors[u.risk_level]+'15' }}>
                        {u.risk_level}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={s.statusBadge(u.is_active, u.is_locked)}>
                        {u.is_locked ? 'Verrouillé' : u.is_active ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td style={s.td}>{new Date(u.created_at).toLocaleDateString('fr-TN')}</td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        <Link to={`/admin/users/${u.id}`} style={s.btnView} title="Voir détail">
                          <Eye size={14} />
                        </Link>
                        <button style={s.btnDeposit} onClick={() => { setDepositModal(u.id); setDepositError(''); setDepositForm({ amount:'', description:'' }); }} title="Dépôt">
                          <DollarSign size={14} />
                        </button>
                        <button style={s.btnToggle(u.is_active)} onClick={() => toggleStatus(u.id)} title={u.is_active ? 'Suspendre' : 'Activer'}>
                          {u.is_active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                        </button>
                        <button style={s.btnLock(u.is_locked)} onClick={() => toggleLock(u.id)} title={u.is_locked ? 'Déverrouiller' : 'Verrouiller'}>
                          {u.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Deposit Modal */}
        {depositModal && (
          <div style={s.overlay}>
            <div style={s.modal}>
              <div style={s.modalHeader}>
                <div style={s.modalIcon}><DollarSign size={20} color="#15803d" /></div>
                <div>
                  <h3 style={s.modalTitle}>Effectuer un dépôt</h3>
                  {selectedUser && <p style={s.modalSub}>{selectedUser.first_name} {selectedUser.last_name} — {selectedUser.email}</p>}
                </div>
              </div>

              {depositError && (
                <div style={s.depositError}>
                  <XCircle size={14} style={{ marginRight:'6px', flexShrink:0 }} />
                  {depositError}
                </div>
              )}

              <form onSubmit={handleDeposit} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>Montant (TND) *</label>
                  <div style={s.amountWrap}>
                    <input
                      style={s.amountInput}
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="0.000"
                      value={depositForm.amount}
                      onChange={e => { setDepositForm({...depositForm, amount:e.target.value}); setDepositError(''); }}
                      required
                      autoFocus
                    />
                    <span style={s.amountCur}>TND</span>
                  </div>
                  <div style={s.quickAmounts}>
                    {[100, 500, 1000, 5000, 10000].map(a => (
                      <button key={a} type="button" style={{ ...s.quickAmt, ...(parseFloat(depositForm.amount)===a ? s.quickAmtActive : {}) }}
                        onClick={() => setDepositForm({...depositForm, amount:a.toString()})}>
                        {a.toLocaleString()} TND
                      </button>
                    ))}
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Description / Motif</label>
                  <input style={s.input} value={depositForm.description}
                    onChange={e => setDepositForm({...depositForm, description:e.target.value})}
                    placeholder="Ex: Bonus, correction, remboursement..." />
                </div>
                <div style={s.modalBtns}>
                  <button type="button" style={s.cancelBtn} onClick={() => { setDepositModal(null); setDepositError(''); }}>Annuler</button>
                  <button type="submit" style={s.confirmBtn}>
                    <DollarSign size={15} style={{ marginRight:'6px' }} />
                    Confirmer le dépôt
                  </button>
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
  toolbar: { display:'flex', gap:'12px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap' },
  searchWrap: { flex:1, minWidth:'200px', position:'relative' },
  search: { width:'100%', padding:'10px 14px 10px 38px', background:'#fff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500', boxSizing:'border-box' },
  filter: { padding:'10px 14px', background:'#fff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500' },
  count: { fontSize:'13px', color:'#1e293b', fontWeight:'700', whiteSpace:'nowrap' },
  msgBox: (type) => ({ background: type==='success' ? '#f0fdf4' : '#fef2f2', border:`1px solid ${type==='success' ? '#bbf7d0' : '#fecaca'}`, color: type==='success' ? '#15803d' : '#dc2626', padding:'12px 16px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', fontWeight:'600', display:'flex', alignItems:'center' }),
  card: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', overflow:'auto', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  loading: { color:'#374151', textAlign:'center', padding:'40px' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'1000px' },
  th: { padding:'12px 14px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4ff', background:'#f8faff', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f0f4ff' },
  td: { padding:'11px 14px', fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  userCell: { display:'flex', alignItems:'center', gap:'10px' },
  avatar: { width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'#fff', flexShrink:0 },
  userName: { fontSize:'13px', color:'#0f172a', fontWeight:'700' },
  userCin: { fontSize:'10px', color:'#374151', fontFamily:'monospace', fontWeight:'600' },
  contactEmail: { fontSize:'12px', color:'#1e293b', fontWeight:'600' },
  contactPhone: { fontSize:'11px', color:'#374151', fontWeight:'500' },
  kycSelect: { border:'none', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer', outline:'none' },
  riskBadge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' },
  statusBadge: (active, locked) => ({ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background: locked ? '#fef2f2' : active ? '#f0fdf4' : '#f8faff', color: locked ? '#dc2626' : active ? '#15803d' : '#374151', border: `1px solid ${locked ? '#fecaca' : active ? '#bbf7d0' : '#e8edf8'}` }),
  actions: { display:'flex', gap:'4px' },
  btnView: { width:'30px', height:'30px', background:'#f5f3ff', border:'none', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'#6366f1', cursor:'pointer', textDecoration:'none' },
  btnDeposit: { width:'30px', height:'30px', background:'#f0fdf4', border:'none', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'#15803d', cursor:'pointer' },
  btnToggle: (active) => ({ width:'30px', height:'30px', background: active ? '#fffbeb' : '#f0fdf4', border:'none', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color: active ? '#d97706' : '#15803d', cursor:'pointer' }),
  btnLock: (locked) => ({ width:'30px', height:'30px', background: locked ? '#f0fdf4' : '#fef2f2', border:'none', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color: locked ? '#15803d' : '#dc2626', cursor:'pointer' }),
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 },
  modal: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'20px', padding:'28px', width:'460px', boxShadow:'0 24px 80px rgba(99,102,241,0.2)' },
  modalHeader: { display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px' },
  modalIcon: { width:'44px', height:'44px', background:'#f0fdf4', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  modalTitle: { fontSize:'17px', fontWeight:'800', color:'#0f172a', marginBottom:'2px' },
  modalSub: { fontSize:'12px', color:'#374151', fontWeight:'500' },
  depositError: { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'10px 14px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', fontWeight:'500', display:'flex', alignItems:'center' },
  form: { display:'flex', flexDirection:'column', gap:'14px' },
  field: { display:'flex', flexDirection:'column', gap:'8px' },
  label: { fontSize:'12px', color:'#374151', fontWeight:'700' },
  amountWrap: { display:'flex', alignItems:'center', gap:'0' },
  amountInput: { flex:1, padding:'13px 16px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px 0 0 12px', color:'#0f172a', fontSize:'18px', fontWeight:'800', outline:'none', borderRight:'none' },
  amountCur: { padding:'13px 16px', background:'#f0f4ff', border:'2px solid #e8edf8', borderRadius:'0 12px 12px 0', color:'#6366f1', fontSize:'14px', fontWeight:'700', borderLeft:'none' },
  quickAmounts: { display:'flex', gap:'6px', flexWrap:'wrap' },
  quickAmt: { padding:'5px 12px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'8px', color:'#374151', fontSize:'11px', fontWeight:'600', cursor:'pointer' },
  quickAmtActive: { background:'#f5f3ff', border:'2px solid #6366f1', color:'#6366f1', fontWeight:'700' },
  input: { padding:'11px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', color:'#0f172a', fontSize:'13px', outline:'none', fontWeight:'500' },
  modalBtns: { display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'4px' },
  cancelBtn: { padding:'11px 20px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#374151', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  confirmBtn: { padding:'11px 24px', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', boxShadow:'0 4px 12px rgba(16,185,129,0.3)' },
};
