import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { Users, Landmark, ArrowLeftRight, DollarSign, Gem, Clock, AlertTriangle, FileText } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e8edf8', borderRadius:'12px', padding:'12px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.1)' }}>
      {label && <p style={{ fontSize:'11px', color:'#94a3b8', marginBottom:'6px' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize:'13px', fontWeight:'700', color:p.color }}>{p.name || p.dataKey}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/admin/transactions?limit=12').then(r => setTransactions(r.data));
    api.get('/admin/fraud-alerts').then(r => setFraudAlerts(r.data.slice(0,5)));
  }, []);

  const statCards = stats ? [
    { label:'Clients',        value:stats.total_users,                    Icon: Users,          gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)', sub:'+12% ce mois' },
    { label:'Comptes',        value:stats.total_accounts,                 Icon: Landmark,       gradient:'linear-gradient(135deg,#06b6d4,#0891b2)', sub:'comptes actifs' },
    { label:'Transactions',   value:stats.total_transactions.toLocaleString(), Icon: ArrowLeftRight, gradient:'linear-gradient(135deg,#10b981,#059669)', sub:'opérations' },
    { label:'Volume',         value: stats.total_volume >= 1e9 ? `${(stats.total_volume/1e9).toFixed(2)} Md TND` : stats.total_volume >= 1e6 ? `${(stats.total_volume/1e6).toFixed(1)}M TND` : `${(stats.total_volume/1000).toFixed(1)}K TND`, Icon: DollarSign, gradient:'linear-gradient(135deg,#f59e0b,#d97706)', sub:'TND total' },
    { label:'Solde total',    value: stats.total_balance >= 1e9 ? `${(stats.total_balance/1e9).toFixed(2)} Md TND` : stats.total_balance >= 1e6 ? `${(stats.total_balance/1e6).toFixed(1)}M TND` : `${(stats.total_balance/1000).toFixed(1)}K TND`, Icon: Gem, gradient:'linear-gradient(135deg,#8b5cf6,#7c3aed)', sub:'TND en dépôt' },
    { label:'KYC en attente', value:stats.pending_kyc,                   Icon: Clock,          gradient:'linear-gradient(135deg,#f59e0b,#d97706)', sub:'à traiter' },
    { label:'Modifications',  value:stats.pending_change_requests,         Icon: FileText,       gradient:'linear-gradient(135deg,#ec4899,#db2777)', sub:'en attente' },
    { label:'Alertes fraude', value:stats.open_fraud_alerts,              Icon: AlertTriangle,  gradient:'linear-gradient(135deg,#ef4444,#dc2626)', sub:'ouvertes' },
  ] : [];

  const chartData = transactions.reduce((acc, tx) => {
    const day = new Date(tx.created_at).toLocaleDateString('fr-TN', { day:'2-digit', month:'2-digit' });
    const ex = acc.find(d => d.date === day);
    if (ex) { ex.amount += parseFloat(tx.amount); ex.count += 1; }
    else acc.push({ date:day, amount:parseFloat(tx.amount), count:1 });
    return acc;
  }, []).reverse();

  const sevColor = { low:'#10b981', medium:'#f59e0b', high:'#ef4444', critical:'#dc2626' };
  const typeColors = { transfer_internal:'#6366f1', transfer_interbank:'#8b5cf6', deposit:'#10b981', withdrawal:'#ef4444', payment_bill:'#f59e0b', recharge_mobile:'#06b6d4' };

  return (
    <Layout title="Dashboard Administrateur">
      <div style={s.page}>
        {/* Stats Grid */}
        <div style={s.statsGrid}>
          {statCards.map((c, i) => (
            <div key={c.label} style={{ ...s.statCard, animationDelay:`${i*0.06}s` }} className="animate-fadeInUp card-hover">
              <div style={{ ...s.statIconWrap, background:c.gradient }}>
                <c.Icon size={20} color="#fff" strokeWidth={2} />
              </div>
              <div style={s.statInfo}>
                <p style={s.statVal}>{c.value ?? '...'}</p>
                <p style={s.statLabel}>{c.label}</p>
                <p style={s.statSub}>{c.sub}</p>
              </div>
              <div style={{ ...s.statGlow, background:c.gradient }} />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={s.charts}>
          <div style={s.chartCard} className="animate-fadeInUp card-hover">
            <h3 style={s.chartTitle}>Volume des transactions (TND)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" name="Volume" stroke="#6366f1" fill="url(#volGrad)" strokeWidth={2.5}
                  dot={{ fill:'#6366f1', r:3 }} animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={s.chartCard} className="animate-fadeInUp card-hover">
            <h3 style={s.chartTitle}>Nombre de transactions</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Transactions" fill="#10b981" radius={[5,5,0,0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={s.bottomGrid}>
          {/* Recent Transactions */}
          <div style={s.tableCard} className="animate-fadeInUp card-hover">
            <h3 style={s.chartTitle}>Transactions récentes</h3>
            <table style={s.table}>
              <thead>
                <tr>{['Référence','Type','De','Vers','Montant','Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {transactions.slice(0,8).map(tx => (
                  <tr key={tx.id} style={s.tr}>
                    <td style={s.td}><code style={s.ref}>{tx.reference?.slice(0,10)}</code></td>
                    <td style={s.td}><span style={{ ...s.typeBadge, background:(typeColors[tx.type]||'#64748b')+'15', color:typeColors[tx.type]||'#64748b' }}>{tx.type?.replace(/_/g,' ')}</span></td>
                    <td style={s.td}>{tx.from_user||'-'}</td>
                    <td style={s.td}>{tx.to_user||'-'}</td>
                    <td style={{ ...s.td, color:'#10b981', fontWeight:'700' }}>{parseFloat(tx.amount).toFixed(3)} TND</td>
                    <td style={s.td}>{new Date(tx.created_at).toLocaleDateString('fr-TN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fraud Alerts */}
          <div style={s.alertsCard} className="animate-fadeInUp card-hover">
            <h3 style={s.chartTitle}>🚨 Alertes fraude</h3>
            {fraudAlerts.length === 0 ? (
              <div style={s.noAlerts}>
                <span style={s.noAlertsIcon}>✅</span>
                <p style={s.noAlertsText}>Aucune alerte active</p>
              </div>
            ) : fraudAlerts.map(a => (
              <div key={a.id} style={s.alertRow}>
                <div style={{ ...s.alertSevDot, background:sevColor[a.severity] }} />
                <div style={s.alertInfo}>
                  <p style={s.alertType}>{a.alert_type}</p>
                  <p style={s.alertClient}>{a.client_name}</p>
                </div>
                <span style={{ ...s.alertSevBadge, background:sevColor[a.severity]+'15', color:sevColor[a.severity] }}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1300px' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' },
  statCard: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'18px', padding:'18px', display:'flex', alignItems:'center', gap:'14px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)', position:'relative', overflow:'hidden' },
  statIconWrap: { width:'48px', height:'48px', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(0,0,0,0.15)' },
  statInfo: { flex:1 },
  statVal: { fontSize:'22px', fontWeight:'800', color:'#1e293b', marginBottom:'2px' },
  statLabel: { fontSize:'12px', color:'#1e293b', fontWeight:'700' },
  statSub: { fontSize:'10px', color:'#374151' },
  statGlow: { position:'absolute', right:'-20px', top:'-20px', width:'80px', height:'80px', borderRadius:'50%', opacity:0.06, pointerEvents:'none' },
  charts: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' },
  chartCard: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  chartTitle: { fontSize:'14px', fontWeight:'700', color:'#1e293b', marginBottom:'14px' },
  bottomGrid: { display:'grid', gridTemplateColumns:'2fr 1fr', gap:'16px' },
  tableCard: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)', overflow:'auto' },
  alertsCard: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'18px', padding:'20px', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'600px' },
  th: { padding:'10px 12px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4ff' },
  tr: { borderBottom:'1px solid #f8faff', transition:'background 0.15s' },
  td: { padding:'10px 12px', fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  ref: { background:'#f5f3ff', color:'#7c3aed', padding:'2px 6px', borderRadius:'6px', fontSize:'10px', fontWeight:'600' },
  typeBadge: { padding:'3px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'600' },
  noAlerts: { display:'flex', flexDirection:'column', alignItems:'center', padding:'30px', gap:'8px' },
  noAlertsIcon: { fontSize:'36px' },
  noAlertsText: { color:'#374151', fontSize:'13px' },
  alertRow: { display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:'1px solid #f8faff' },
  alertSevDot: { width:'8px', height:'8px', borderRadius:'50%', flexShrink:0 },
  alertInfo: { flex:1 },
  alertType: { fontSize:'12px', color:'#1e293b', fontWeight:'600' },
  alertClient: { fontSize:'11px', color:'#374151' },
  alertSevBadge: { padding:'3px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', textTransform:'uppercase' },
};
