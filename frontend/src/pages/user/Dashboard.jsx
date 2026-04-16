import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Send, Zap, CreditCard, TrendingUp, PiggyBank, BarChart2, ArrowDownLeft, ArrowUpRight, RefreshCw, Smartphone } from 'lucide-react';

// Animated counter
function AnimatedNumber({ value, decimals = 3, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const start = useRef(0);
  const raf = useRef(null);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start.current + (target - start.current) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(animate);
      else start.current = target;
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  // Format large numbers nicely
  if (display >= 1_000_000_000) {
    return <span>{(display / 1_000_000_000).toLocaleString('fr-TN', { minimumFractionDigits:3, maximumFractionDigits:3 })} Md</span>;
  }
  if (display >= 1_000_000) {
    return <span>{(display / 1_000_000).toLocaleString('fr-TN', { minimumFractionDigits:3, maximumFractionDigits:3 })} M</span>;
  }
  return <span>{display.toLocaleString('fr-TN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}

const quickActions = [
  { to:'/transfer', Icon:Send,        label:'Virement',  gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { to:'/bills',    Icon:Zap,         label:'Factures',  gradient:'linear-gradient(135deg,#10b981,#059669)' },
  { to:'/cards',    Icon:CreditCard,  label:'Cartes',    gradient:'linear-gradient(135deg,#f59e0b,#d97706)' },
  { to:'/loans',    Icon:TrendingUp,  label:'Crédit',    gradient:'linear-gradient(135deg,#ef4444,#dc2626)' },
  { to:'/savings',  Icon:PiggyBank,   label:'Épargne',   gradient:'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { to:'/analytics',Icon:BarChart2,   label:'Analyse',   gradient:'linear-gradient(135deg,#06b6d4,#0891b2)' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ categories:[], monthly:[] });
  const [activeAcc, setActiveAcc] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/user/accounts'),
      api.get('/user/transactions?limit=6'),
      api.get('/user/analytics'),
    ]).then(([a, t, an]) => {
      setAccounts(a.data);
      setTransactions(t.data);
      setAnalytics(an.data);
      setLoaded(true);
    });
  }, []);

  const acc = accounts[activeAcc];
  const totalBalance = accounts.reduce((s,a) => s + parseFloat(a.balance), 0);

  const txIcon = (type) => {
    if (type?.includes('deposit')) return { Icon: ArrowDownLeft, bg:'#dcfce7', color:'#16a34a' };
    if (type?.includes('transfer')) return { Icon: RefreshCw, bg:'#ede9fe', color:'#7c3aed' };
    if (type?.includes('bill') || type?.includes('payment')) return { Icon: Zap, bg:'#fef3c7', color:'#d97706' };
    if (type?.includes('recharge')) return { Icon: Smartphone, bg:'#e0f2fe', color:'#0284c7' };
    return { Icon: ArrowUpRight, bg:'#fee2e2', color:'#dc2626' };
  };

  return (
    <Layout title="Tableau de bord">
      <div style={s.page}>
        {/* Greeting */}
        <div style={s.greeting} className="animate-fadeInUp">
          <div>
            <h2 style={s.greetTitle}>
              Bonjour, <span className="gradient-text">{user?.first_name}</span> 👋
            </h2>
            <p style={s.greetSub}>{new Date().toLocaleDateString('fr-TN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
          </div>
          {user?.kyc_status !== 'verified' && (
            <Link to="/kyc" style={s.kycAlert} className="animate-pulse">
              ⚠ Complétez votre KYC pour débloquer toutes les fonctionnalités →
            </Link>
          )}
        </div>

        {/* Hero Balance Card */}
        <div style={s.heroCard} className="animate-fadeInUp card-hover">
          <div style={s.heroGlow} />
          <div style={s.heroContent}>
            <div style={s.heroLeft}>
              <p style={s.heroLabel}>Solde total</p>
              <p style={s.heroBalance}>
                {loaded ? <AnimatedNumber value={totalBalance} /> : '—'} <span style={s.heroCur}>TND</span>
              </p>
              <div style={s.accountTabs}>
                {accounts.map((a, i) => (
                  <button key={a.id} style={{ ...s.accTab, ...(i === activeAcc ? s.accTabActive : {}) }} onClick={() => setActiveAcc(i)}>
                    {a.account_type === 'current' ? 'Courant' : a.account_type === 'savings' ? 'Épargne' : a.account_type}
                  </button>
                ))}
              </div>
              {acc && (
                <div style={s.bankDetails}>
                  <div style={s.bankDetailRow}>
                    <span style={s.bankDetailLabel}>RIB</span>
                    <span style={s.bankDetailVal}>{acc.rib}</span>
                    <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(acc.rib)} title="Copier">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </div>
                  <div style={s.bankDetailRow}>
                    <span style={s.bankDetailLabel}>IBAN</span>
                    <span style={s.bankDetailVal}>{acc.iban}</span>
                    <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(acc.iban)} title="Copier">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={s.heroRight}>
              <div style={s.heroCircle}>
                <TrendingUp size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          {/* Mini chart */}
          {analytics.monthly.length > 0 && (
            <div style={s.miniChart}>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={analytics.monthly}>
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgba(255,255,255,0.4)" />
                      <stop offset="95%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="income" stroke="rgba(255,255,255,0.8)" fill="url(#heroGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={s.quickGrid}>
          {quickActions.map((a, i) => (
            <Link key={a.to} to={a.to} style={{ ...s.quickBtn, animationDelay:`${i*0.06}s` }} className="animate-fadeInUp card-hover">
              <div style={{ ...s.quickIcon, background: a.gradient }}>
                <a.Icon size={20} color="#fff" strokeWidth={2} />
              </div>
              <span style={s.quickLabel}>{a.label}</span>
            </Link>
          ))}
        </div>

        <div style={s.grid}>
          {/* Transactions */}
          <div style={s.card} className="animate-fadeInUp card-hover">
            <div style={s.cardHead}>
              <h3 style={s.cardTitle}>Transactions récentes</h3>
              <Link to="/transactions" style={s.seeAll}>Voir tout →</Link>
            </div>
            {transactions.length === 0
              ? <p style={s.empty}>Aucune transaction</p>
              : transactions.map((tx, i) => {
                const { Icon, bg, color } = txIcon(tx.type);
                const isIn = tx.to_account_id === acc?.id;
                return (
                  <div key={tx.id} style={{ ...s.txRow, animationDelay:`${i*0.05}s` }} className="animate-fadeInUp">
                    <div style={{ ...s.txIcon, background: bg, color }}>
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <div style={s.txInfo}>
                      <p style={s.txDesc}>{tx.description || tx.type}</p>
                      <p style={s.txMeta}>{tx.category} · {new Date(tx.created_at).toLocaleDateString('fr-TN')}</p>
                    </div>
                    <p style={{ ...s.txAmt, color: isIn ? '#16a34a' : '#dc2626' }}>
                      {isIn ? '+' : '-'}<AnimatedNumber value={tx.amount} duration={600} />
                      <span style={s.txCur}> TND</span>
                    </p>
                  </div>
                );
              })
            }
          </div>

          {/* Analytics Card */}
          <div style={s.card} className="animate-fadeInUp card-hover">
            <h3 style={s.cardTitle}>Revenus vs Dépenses</h3>
            {analytics.monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analytics.monthly}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ background:'#fff', border:'1px solid #e8edf8', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', fontSize:'12px' }} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incGrad)" strokeWidth={2.5} dot={{ fill:'#10b981', r:3 }} animationDuration={1500} />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2.5} dot={{ fill:'#ef4444', r:3 }} animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={s.chartEmpty}>
                <div style={s.emptyIcon}>📊</div>
                <p style={s.empty}>Effectuez des transactions pour voir vos statistiques</p>
              </div>
            )}
            <div style={s.chartLegend}>
              <span style={s.legendItem('#10b981')}>● Revenus</span>
              <span style={s.legendItem('#ef4444')}>● Dépenses</span>
            </div>

            {/* Top categories */}
            {analytics.categories.length > 0 && (
              <div style={s.catSection}>
                <p style={s.catTitle}>Top dépenses</p>
                {analytics.categories.slice(0,4).map((c, i) => {
                  const pct = Math.min(100, (parseFloat(c.total) / parseFloat(analytics.categories[0].total)) * 100);
                  return (
                    <div key={c.category} style={{ ...s.catRow, animationDelay:`${i*0.1}s` }} className="animate-fadeInUp">
                      <span style={s.catName}>{c.category}</span>
                      <div style={s.catBarWrap}>
                        <div style={{ ...s.catBar, width:`${pct}%`, background: ['#6366f1','#8b5cf6','#06b6d4','#f59e0b'][i] }} />
                      </div>
                      <span style={s.catAmt}>{parseFloat(c.total).toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1200px' },
  greeting: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'12px' },
  greetTitle: { fontSize:'26px', fontWeight:'800', color:'#1e293b', marginBottom:'4px' },
  greetSub: { color:'#374151', fontSize:'13px', textTransform:'capitalize' },
  kycAlert: { background:'linear-gradient(135deg,#fef3c7,#fde68a)', border:'1px solid #fbbf24', color:'#92400e', padding:'10px 16px', borderRadius:'12px', fontSize:'13px', fontWeight:'600', boxShadow:'0 4px 12px rgba(251,191,36,0.2)' },
  heroCard: { background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#06b6d4 100%)', borderRadius:'24px', padding:'28px', marginBottom:'24px', position:'relative', overflow:'hidden', boxShadow:'0 20px 60px rgba(99,102,241,0.35)', backgroundSize:'200% 200%', animation:'gradientShift 6s ease infinite' },
  heroGlow: { position:'absolute', top:'-50%', right:'-10%', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' },
  heroContent: { display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:1 },
  heroLeft: {},
  heroLabel: { color:'rgba(255,255,255,0.75)', fontSize:'13px', marginBottom:'8px', fontWeight:'500' },
  heroBalance: { fontSize:'42px', fontWeight:'900', color:'#fff', marginBottom:'14px', letterSpacing:'-1px' },
  heroCur: { fontSize:'18px', fontWeight:'400', opacity:0.8 },
  accountTabs: { display:'flex', gap:'8px', marginBottom:'10px' },
  accTab: { padding:'5px 12px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'20px', color:'rgba(255,255,255,0.8)', fontSize:'11px', fontWeight:'500', cursor:'pointer', transition:'all 0.2s' },
  accTabActive: { background:'rgba(255,255,255,0.3)', color:'#fff', border:'1px solid rgba(255,255,255,0.5)' },
  heroRib: { fontSize:'11px', color:'rgba(255,255,255,0.5)', fontFamily:'monospace' },
  bankDetails: { display:'flex', flexDirection:'column', gap:'6px', marginTop:'4px' },
  bankDetailRow: { display:'flex', alignItems:'center', gap:'8px' },
  bankDetailLabel: { fontSize:'10px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'1px', minWidth:'32px', fontWeight:'600' },
  bankDetailVal: { fontSize:'11px', color:'rgba(255,255,255,0.85)', fontFamily:'monospace', fontWeight:'600', letterSpacing:'0.5px' },
  copyBtn: { background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'4px', padding:'2px 5px', cursor:'pointer', color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', flexShrink:0 },
  heroRight: {},
  heroCircle: { width:'100px', height:'100px', borderRadius:'50%', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px', backdropFilter:'blur(10px)' },
  heroCircleText: { fontSize:'48px' },
  miniChart: { marginTop:'16px', opacity:0.7 },
  quickGrid: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'24px' },
  quickBtn: { background:'#fff', borderRadius:'16px', padding:'18px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', boxShadow:'0 2px 12px rgba(99,102,241,0.08)', border:'1px solid #f0f4ff' },
  quickIcon: { width:'46px', height:'46px', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.15)' },
  quickEmoji: { fontSize:'22px' },
  quickLabel: { color:'#1e293b', fontSize:'11px', fontWeight:'700', textAlign:'center' },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  card: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'20px', padding:'22px', boxShadow:'0 2px 16px rgba(99,102,241,0.06)' },
  cardHead: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' },
  cardTitle: { fontSize:'15px', fontWeight:'700', color:'#1e293b' },
  seeAll: { color:'#6366f1', fontSize:'12px', fontWeight:'600' },
  empty: { color:'#374151', fontSize:'13px', textAlign:'center', padding:'20px 0' },
  txRow: { display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'1px solid #f8faff' },
  txIcon: { width:'38px', height:'38px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', flexShrink:0 },
  txInfo: { flex:1, minWidth:0 },
  txDesc: { fontSize:'13px', color:'#1e293b', fontWeight:'500', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  txMeta: { fontSize:'11px', color:'#374151', marginTop:'2px' },
  txAmt: { fontSize:'13px', fontWeight:'700', whiteSpace:'nowrap' },
  txCur: { fontSize:'11px', fontWeight:'400' },
  chartEmpty: { height:'200px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px' },
  emptyIcon: { fontSize:'40px', opacity:0.3 },
  chartLegend: { display:'flex', gap:'16px', marginTop:'8px', justifyContent:'center' },
  legendItem: (color) => ({ fontSize:'12px', color, fontWeight:'600' }),
  catSection: { marginTop:'16px', borderTop:'1px solid #f8faff', paddingTop:'14px' },
  catTitle: { fontSize:'11px', color:'#374151', fontWeight:'700', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px' },
  catRow: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' },
  catName: { fontSize:'11px', color:'#1e293b', fontWeight:'600', width:'80px', flexShrink:0 },
  catBarWrap: { flex:1, height:'6px', background:'#f0f4ff', borderRadius:'3px', overflow:'hidden' },
  catBar: { height:'100%', borderRadius:'3px', transition:'width 1s ease' },
  catAmt: { fontSize:'11px', color:'#1e293b', fontWeight:'600', width:'60px', textAlign:'right' },
};
