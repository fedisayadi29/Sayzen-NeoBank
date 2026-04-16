import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import { TrendingDown, TrendingUp, FolderOpen, Activity } from 'lucide-react';

const COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#14b8a6','#f97316','#a855f7','#22c55e'];

const fmtAmt = (v) => {
  const n = parseFloat(v);
  if (n >= 1e9) return `${(n/1e9).toFixed(2)} Md`;
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return n.toFixed(3);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e8edf8', borderRadius:'12px', padding:'12px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', minWidth:'160px' }}>
      {label && <p style={{ fontSize:'12px', color:'#374151', marginBottom:'6px', fontWeight:'600' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize:'13px', fontWeight:'700', color: p.color }}>{p.name}: {fmtAmt(p.value)} TND</p>
      ))}
    </div>
  );
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Analytics() {
  const [data, setData] = useState({ categories:[], monthly:[] });
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    api.get('/user/analytics').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const totalExpenses = data.categories.reduce((s,c) => s + parseFloat(c.total), 0);
  const totalIncome   = data.monthly.reduce((s,m) => s + parseFloat(m.income||0), 0);
  const netData = data.monthly.map(m => ({
    ...m,
    net: parseFloat(m.income||0) - parseFloat(m.expenses||0),
    month: m.month?.slice(0,7) || m.month,
  }));
  const avgNet = netData.length ? netData.reduce((s,m) => s+m.net,0)/netData.length : 0;

  if (loading) return (
    <Layout title="Analytique financière">
      <div style={s.loadingPage}>
        <div style={s.loadingSpinner} />
        <p style={s.loadingText}>Analyse de vos données financières...</p>
      </div>
    </Layout>
  );

  return (
    <Layout title="Analytique financière">
      <div style={s.page}>

        {/* Summary Cards */}
        <div style={s.summaryGrid}>
          {[
            { label:'Total dépenses', value: fmtAmt(totalExpenses)+' TND', Icon: TrendingDown, color:'#ef4444', bg:'#fef2f2' },
            { label:'Total revenus',  value: fmtAmt(totalIncome)+' TND',   Icon: TrendingUp,   color:'#10b981', bg:'#f0fdf4' },
            { label:'Catégories',     value: data.categories.length,        Icon: FolderOpen,   color:'#6366f1', bg:'#f5f3ff' },
            { label:'Solde net moyen',value: fmtAmt(avgNet)+' TND',         Icon: Activity,     color:'#f59e0b', bg:'#fffbeb' },
          ].map((c, i) => (
            <div key={c.label} style={{ ...s.sumCard, background:c.bg, animationDelay:`${i*0.08}s` }} className="animate-fadeInUp card-hover">
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: c.color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <c.Icon size={18} color={c.color} strokeWidth={2} />
              </div>
              <div>
                <p style={{ ...s.sumVal, color:c.color }}>{c.value}</p>
                <p style={s.sumLabel}>{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={s.topGrid}>
          {/* Pie Chart */}
          <div style={s.card} className="animate-fadeInUp card-hover">
            <h3 style={s.cardTitle}>Répartition des dépenses</h3>
            {data.categories.length === 0 ? (
              <div style={s.emptyChart}><span style={s.emptyIcon}>📊</span><p style={s.emptyText}>Aucune donnée disponible</p></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data.categories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%" cy="50%"
                      outerRadius={activeIndex !== null ? 105 : 100}
                      innerRadius={55}
                      labelLine={false}
                      label={CustomPieLabel}
                      animationBegin={0}
                      animationDuration={1200}
                      onMouseEnter={(_, i) => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {data.categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]}
                          opacity={activeIndex === null || activeIndex === i ? 1 : 0.6}
                          style={{ cursor:'pointer', transition:'all 0.2s' }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={s.pieLegend}>
                  {data.categories.slice(0,8).map((c, i) => (
                    <div key={c.category} style={s.pieLegendItem}
                      onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)}>
                      <div style={{ ...s.pieDot, background:COLORS[i%COLORS.length] }} />
                      <span style={s.pieLegendLabel}>{c.category}</span>
                      <span style={s.pieLegendVal}>{fmtAmt(c.total)} TND</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bar Chart */}
          <div style={s.card} className="animate-fadeInUp card-hover">
            <h3 style={s.cardTitle}>Revenus vs Dépenses (12 mois)</h3>
            {data.monthly.length === 0 ? (
              <div style={s.emptyChart}><span style={s.emptyIcon}>📊</span><p style={s.emptyText}>Aucune donnée disponible</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly} barGap={4} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                  <XAxis dataKey="month" stroke="#374151" fontSize={10} fontWeight="600" />
                  <YAxis stroke="#374151" fontSize={10} tickFormatter={fmtAmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:'12px', color:'#1e293b', fontWeight:'600' }} />
                  <Bar dataKey="income"   name="Revenus"  fill="#10b981" radius={[6,6,0,0]} animationDuration={1200} />
                  <Bar dataKey="expenses" name="Dépenses" fill="#6366f1" radius={[6,6,0,0]} animationDuration={1400} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Area Chart — Net */}
        <div style={s.card} className="animate-fadeInUp card-hover">
          <h3 style={s.cardTitle}>Évolution du solde net mensuel</h3>
          {netData.length === 0 ? (
            <div style={s.emptyChart}><span style={s.emptyIcon}>📈</span><p style={s.emptyText}>Aucune donnée disponible</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={netData}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                <XAxis dataKey="month" stroke="#374151" fontSize={10} fontWeight="600" />
                <YAxis stroke="#374151" fontSize={10} tickFormatter={fmtAmt} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="net" name="Solde net" stroke="#6366f1" fill="url(#netGrad)"
                  strokeWidth={3} dot={{ fill:'#6366f1', r:5, strokeWidth:2, stroke:'#fff' }}
                  animationDuration={1600} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Table */}
        <div style={s.card} className="animate-fadeInUp card-hover">
          <h3 style={s.cardTitle}>Détail par catégorie</h3>
          {data.categories.length === 0 ? (
            <p style={s.emptyText}>Aucune donnée</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>{['Catégorie','Transactions','Total dépensé','% du total','Barre'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.categories.map((c, i) => {
                    const pct = totalExpenses > 0 ? (parseFloat(c.total)/totalExpenses)*100 : 0;
                    return (
                      <tr key={c.category} style={s.tr} className="animate-fadeInUp">
                        <td style={s.td}>
                          <div style={s.catCell}>
                            <div style={{ ...s.catDot, background:COLORS[i%COLORS.length] }} />
                            <span style={s.catName}>{c.category}</span>
                          </div>
                        </td>
                        <td style={s.td}><span style={s.countBadge}>{c.count}</span></td>
                        <td style={{ ...s.td, fontWeight:'700', color:'#0f172a' }}>{fmtAmt(c.total)} TND</td>
                        <td style={{ ...s.td, color:COLORS[i%COLORS.length], fontWeight:'700' }}>{pct.toFixed(1)}%</td>
                        <td style={s.td}>
                          <div style={s.barWrap}>
                            <div style={{ ...s.barFill, width:`${Math.min(pct,100)}%`, background:COLORS[i%COLORS.length] }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1200px' },
  loadingPage: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:'16px' },
  loadingSpinner: { width:'48px', height:'48px', border:'4px solid #e8edf8', borderTop:'4px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  loadingText: { color:'#374151', fontSize:'14px', fontWeight:'500' },
  summaryGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' },
  sumCard: { borderRadius:'16px', padding:'18px', display:'flex', alignItems:'center', gap:'14px', border:'1px solid rgba(0,0,0,0.04)', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' },
  sumVal: { fontSize:'18px', fontWeight:'800', marginBottom:'2px' },
  sumLabel: { fontSize:'11px', color:'#374151', fontWeight:'600' },
  topGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' },
  card: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'20px', padding:'22px', boxShadow:'0 2px 16px rgba(99,102,241,0.06)', marginBottom:'20px' },
  cardTitle: { fontSize:'15px', fontWeight:'700', color:'#0f172a', marginBottom:'16px' },
  emptyChart: { height:'200px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px' },
  emptyIcon: { fontSize:'40px', opacity:0.3 },
  emptyText: { color:'#374151', fontSize:'13px', textAlign:'center', fontWeight:'500' },
  pieLegend: { display:'flex', flexDirection:'column', gap:'5px', marginTop:'12px' },
  pieLegendItem: { display:'flex', alignItems:'center', gap:'8px', padding:'4px 8px', borderRadius:'8px', cursor:'pointer', transition:'background 0.2s' },
  pieDot: { width:'10px', height:'10px', borderRadius:'50%', flexShrink:0 },
  pieLegendLabel: { flex:1, fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  pieLegendVal: { fontSize:'12px', color:'#0f172a', fontWeight:'700' },
  tableWrap: { overflowX:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'11px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid #f0f4ff' },
  tr: { borderBottom:'1px solid #f8faff', transition:'background 0.15s' },
  td: { padding:'12px 14px', fontSize:'13px', color:'#374151', fontWeight:'500' },
  catCell: { display:'flex', alignItems:'center', gap:'8px' },
  catDot: { width:'10px', height:'10px', borderRadius:'50%' },
  catName: { fontWeight:'700', color:'#0f172a' },
  countBadge: { background:'#f0f4ff', color:'#6366f1', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' },
  barWrap: { width:'120px', height:'8px', background:'#f0f4ff', borderRadius:'4px', overflow:'hidden' },
  barFill: { height:'100%', borderRadius:'4px', transition:'width 1s ease' },
};
