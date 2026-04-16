import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Bot, CreditCard, BarChart2, Flag, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(['admin','compliance'].includes(user.role) ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      {/* Animated background blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.blob3} />

      <div style={s.left} className="animate-fadeInLeft">
        <div style={s.brandWrap}>
          <div style={s.brandIcon} className="animate-float">
            <Shield size={40} color="#fff" strokeWidth={1.5} />
          </div>
          <h1 style={s.brandName}>Sayzen Bank</h1>
          <p style={s.brandTagline}>La banque digitale tunisienne de nouvelle génération</p>
        </div>
        <div style={s.features}>
          {[
            { Icon: Shield,    text:'Sécurité bancaire de niveau militaire' },
            { Icon: Bot,       text:'IA intégrée pour vos finances' },
            { Icon: CreditCard,text:'Cartes virtuelles & physiques Visa' },
            { Icon: BarChart2, text:'Analytique financière avancée' },
            { Icon: Flag,      text:'100% conforme aux normes BCT' },
          ].map(f => (
            <div key={f.text} style={s.feature} className="card-hover">
              <f.Icon size={18} color="#6366f1" strokeWidth={2} />
              <span style={s.featureText}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card} className="animate-fadeInUp glass">
          <div style={s.cardTop}>
            <div style={s.cardLogo}>
              <Shield size={36} color="#6366f1" strokeWidth={1.5} />
            </div>
            <h2 style={s.title}>Connexion</h2>
            <p style={s.subtitle}>Accédez à votre espace bancaire sécurisé</p>
          </div>

          {error && (
            <div style={s.error} className="animate-slideDown">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Adresse email</label>
              <div style={s.inputWrap}>
                <Mail size={16} style={{ position:'absolute', left:'14px', color:'#94a3b8', zIndex:1 }} />
                <input style={s.input} type="email" placeholder="votre@email.com"
                  value={form.email} onChange={e => setForm({...form, email:e.target.value})} required />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Mot de passe</label>
              <div style={s.inputWrap}>
                <Lock size={16} style={{ position:'absolute', left:'14px', color:'#94a3b8', zIndex:1 }} />
                <input style={s.input} type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm({...form, password:e.target.value})} required />
                <button type="button" style={s.eyeBtn} onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                </button>
              </div>
            </div>
            <button style={s.btn} type="submit" disabled={loading} className="btn-ripple">
              {loading ? (
                <span style={s.spinner}>⏳ Connexion en cours...</span>
              ) : (
                '→ Se connecter'
              )}
            </button>
          </form>

          <p style={s.footer}>
            Pas encore client ? <Link to="/register" style={s.link}>Ouvrir un compte gratuitement</Link>
          </p>

          <div style={s.demoBox}>
            <div style={s.demoTitle}>🧪 Comptes de démonstration</div>
            <div style={s.demoRow}>
              <span style={s.demoRole}>👤 Client</span>
              <code style={s.demoVal}>demo@sayzen.tn / Demo@123456</code>
            </div>
            <div style={s.demoRow}>
              <span style={s.demoRole}>⚙ Admin</span>
              <code style={s.demoVal}>admin@sayzen.tn / Sayzen@Admin2024</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', background:'linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0fdff 100%)', position:'relative', overflow:'hidden' },
  blob1: { position:'absolute', top:'-100px', left:'-100px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.15),transparent)', pointerEvents:'none' },
  blob2: { position:'absolute', bottom:'-100px', right:'-100px', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.12),transparent)', pointerEvents:'none' },
  blob3: { position:'absolute', top:'50%', left:'40%', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,0.1),transparent)', pointerEvents:'none' },
  left: { flex:1, padding:'60px', display:'flex', flexDirection:'column', justifyContent:'center', position:'relative', zIndex:1 },
  brandWrap: { marginBottom:'48px' },
  brandIcon: { width:'72px', height:'72px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'16px', boxShadow:'0 8px 32px rgba(99,102,241,0.4)' },
  brandName: { fontSize:'44px', fontWeight:'900', background:'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'12px', backgroundSize:'200% 200%', animation:'gradientShift 4s ease infinite' },
  brandTagline: { fontSize:'16px', color:'#374151', lineHeight:'1.6', maxWidth:'400px', fontWeight:'500' },
  features: { display:'flex', flexDirection:'column', gap:'12px' },
  feature: { display:'flex', alignItems:'center', gap:'12px', padding:'12px 18px', background:'rgba(255,255,255,0.7)', borderRadius:'14px', border:'1px solid rgba(99,102,241,0.1)', backdropFilter:'blur(10px)', boxShadow:'0 2px 8px rgba(99,102,241,0.06)' },
  featureIcon: { fontSize:'20px' },
  featureText: { fontSize:'14px', color:'#1e293b', fontWeight:'600' },
  right: { width:'500px', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', position:'relative', zIndex:1 },
  card: { width:'100%', borderRadius:'28px', padding:'40px', boxShadow:'0 24px 80px rgba(99,102,241,0.15)' },
  cardTop: { textAlign:'center', marginBottom:'28px' },
  cardLogo: { width:'56px', height:'56px', background:'#f5f3ff', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' },
  title: { fontSize:'28px', fontWeight:'800', color:'#1e293b', marginBottom:'6px' },
  subtitle: { color:'#374151', fontSize:'14px', fontWeight:'500' },
  error: { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'12px 16px', borderRadius:'12px', marginBottom:'20px', fontSize:'13px', fontWeight:'500' },
  form: { display:'flex', flexDirection:'column', gap:'18px' },
  field: { display:'flex', flexDirection:'column', gap:'7px' },
  label: { fontSize:'13px', fontWeight:'600', color:'#374151' },
  inputWrap: { position:'relative', display:'flex', alignItems:'center' },
  inputIcon: { position:'absolute', left:'14px', fontSize:'16px', zIndex:1 },
  input: { width:'100%', padding:'13px 16px 13px 42px', background:'#f8faff', border:'2px solid #e8edf8', borderRadius:'14px', color:'#1e293b', fontSize:'14px', outline:'none', transition:'border 0.2s', boxSizing:'border-box' },
  eyeBtn: { position:'absolute', right:'12px', background:'none', border:'none', fontSize:'16px', cursor:'pointer' },
  btn: { padding:'15px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'14px', color:'#fff', fontSize:'15px', fontWeight:'700', cursor:'pointer', boxShadow:'0 8px 24px rgba(99,102,241,0.35)', transition:'transform 0.2s', marginTop:'4px' },
  spinner: { display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' },
  footer: { textAlign:'center', marginTop:'20px', color:'#374151', fontSize:'13px', fontWeight:'500' },
  link: { color:'#6366f1', fontWeight:'700' },
  demoBox: { marginTop:'20px', padding:'16px', background:'linear-gradient(135deg,#f5f3ff,#ede9fe)', border:'1px solid #ddd6fe', borderRadius:'14px' },
  demoTitle: { fontSize:'11px', fontWeight:'700', color:'#7c3aed', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' },
  demoRow: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' },
  demoRole: { fontSize:'11px', color:'#6d28d9', fontWeight:'600', minWidth:'55px' },
  demoVal: { fontSize:'11px', color:'#4c1d95', background:'rgba(124,58,237,0.08)', padding:'3px 8px', borderRadius:'6px' },
};
