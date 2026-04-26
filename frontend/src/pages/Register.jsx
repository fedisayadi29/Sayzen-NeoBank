import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Shield } from 'lucide-react';

const GOVERNORATES = ['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan'];

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name:'', last_name:'', email:'', password:'', confirm_password:'',
    phone:'+216', cin:'', date_of_birth:'', gender:'', address:'', city:'', governorate:''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const f = (key) => ({ value: form[key], onChange: e => setForm({...form, [key]: e.target.value}) });

  const validateStep1 = () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) return 'Remplissez tous les champs obligatoires';
    if (form.password !== form.confirm_password) return 'Les mots de passe ne correspondent pas';
    if (form.password.length < 8) return 'Mot de passe trop court (min. 8 caractères)';
    if (!/^\+216[0-9]{8}$/.test(form.phone)) return 'Numéro tunisien invalide (+216XXXXXXXX)';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(''); setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirm_password: _cp, ...data } = form;
      await register(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logo}>
          <Shield size={22} color="#6366f1" strokeWidth={2} />
          <span style={s.logoText}>Sayzen Bank</span>
        </div>
          <h2 style={s.title}>Ouvrir un compte</h2>
          <p style={s.subtitle}>Rejoignez la banque digitale tunisienne</p>
          <div style={s.steps}>
            {[1,2].map(n => (
              <div key={n} style={{ ...s.step, ...(step >= n ? s.stepActive : {}) }}>
                <div style={{ ...s.stepNum, ...(step >= n ? s.stepNumActive : {}) }}>{n}</div>
                <span style={s.stepLabel}>{n===1 ? 'Informations' : 'Identité'}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <div style={s.error}>⚠ {error}</div>}

        {step === 1 && (
          <div style={s.form}>
            <div style={s.row}>
              <div style={s.field}><label style={s.label}>Prénom *</label><input style={s.input} placeholder="Mohamed" {...f('first_name')} /></div>
              <div style={s.field}><label style={s.label}>Nom *</label><input style={s.input} placeholder="Ben Salah" {...f('last_name')} /></div>
            </div>
            <div style={s.field}><label style={s.label}>Email *</label><input style={s.input} type="email" placeholder="votre@email.com" {...f('email')} /></div>
            <div style={s.field}>
              <label style={s.label}>Téléphone tunisien *</label>
              <input style={s.input} placeholder="+21698765432" {...f('phone')} />
              <span style={s.hint}>Format: +216 suivi de 8 chiffres</span>
            </div>
            <div style={s.row}>
              <div style={s.field}><label style={s.label}>Mot de passe *</label><input style={s.input} type="password" placeholder="Min. 8 caractères" {...f('password')} /></div>
              <div style={s.field}><label style={s.label}>Confirmer *</label><input style={s.input} type="password" placeholder="Répéter" {...f('confirm_password')} /></div>
            </div>
            <button style={s.btn} type="button" onClick={handleNext}>Suivant →</button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.row}>
              <div style={s.field}><label style={s.label}>CIN</label><input style={s.input} placeholder="12345678" {...f('cin')} /></div>
              <div style={s.field}>
                <label style={s.label}>Genre</label>
                <select style={s.input} {...f('gender')}>
                  <option value="">Sélectionner</option>
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>
            </div>
            <div style={s.field}><label style={s.label}>Date de naissance</label><input style={s.input} type="date" {...f('date_of_birth')} /></div>
            <div style={s.field}><label style={s.label}>Adresse</label><input style={s.input} placeholder="15 Rue de la République" {...f('address')} /></div>
            <div style={s.row}>
              <div style={s.field}><label style={s.label}>Ville</label><input style={s.input} placeholder="Tunis" {...f('city')} /></div>
              <div style={s.field}>
                <label style={s.label}>Gouvernorat</label>
                <select style={s.input} {...f('governorate')}>
                  <option value="">Sélectionner</option>
                  {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div style={s.btnRow}>
              <button style={s.btnBack} type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={14} style={{ marginRight:'4px', verticalAlign:'middle' }} />Retour
              </button>
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        )}

        <p style={s.footer}>Déjà client ? <Link to="/login" style={s.link}>Se connecter</Link></p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0fdff 100%)', padding:'20px' },
  card: { background:'rgba(255,255,255,0.9)', border:'1px solid #e8edf8', borderRadius:'24px', padding:'40px', width:'100%', maxWidth:'520px', backdropFilter:'blur(20px)', boxShadow:'0 24px 80px rgba(99,102,241,0.12)' },
  header: { marginBottom:'28px' },
  logo: { display:'flex', alignItems:'center', gap:'8px', fontSize:'20px', marginBottom:'16px' },
  logoText: { fontWeight:'800', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  title: { fontSize:'26px', fontWeight:'800', color:'#1e293b', marginBottom:'4px' },
  subtitle: { color:'#374151', fontSize:'13px', marginBottom:'20px', fontWeight:'500' },
  steps: { display:'flex', gap:'20px' },
  step: { display:'flex', alignItems:'center', gap:'8px', opacity:0.4 },
  stepActive: { opacity:1 },
  stepNum: { width:'26px', height:'26px', borderRadius:'50%', background:'#f0f4ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'#374151', border:'2px solid #e8edf8' },
  stepNumActive: { background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff' },
  stepLabel: { fontSize:'12px', color:'#1e293b', fontWeight:'600' },
  error: { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'12px 16px', borderRadius:'12px', marginBottom:'20px', fontSize:'13px' },
  form: { display:'flex', flexDirection:'column', gap:'14px' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#374151' },
  input: { padding:'12px 14px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', color:'#1e293b', fontSize:'13px', outline:'none', transition:'border 0.2s' },
  hint: { fontSize:'11px', color:'#374151', fontWeight:'500' },
  btn: { padding:'13px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', marginTop:'4px', boxShadow:'0 4px 16px rgba(99,102,241,0.3)' },
  btnBack: { padding:'13px 20px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'12px', color:'#1e293b', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  btnRow: { display:'flex', gap:'10px', marginTop:'4px' },
  footer: { textAlign:'center', marginTop:'20px', color:'#374151', fontSize:'13px', fontWeight:'500' },
  link: { color:'#6366f1', fontWeight:'700' },
};
