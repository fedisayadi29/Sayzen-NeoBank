import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

const SEV_COLORS = { low:'#10b981', medium:'#f59e0b', high:'#ef4444', critical:'#dc2626' };
const STATUS_COLORS = { open:'#ef4444', investigating:'#f59e0b', resolved:'#10b981', false_positive:'#64748b' };

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/fraud-alerts').then(r => setAlerts(r.data)).finally(() => setLoading(false));
  }, []);

  const resolve = async (id, status) => {
    await api.patch(`/admin/fraud-alerts/${id}`, { status });
    setAlerts(alerts.map(a => a.id === id ? { ...a, status } : a));
  };

  const openAlerts = alerts.filter(a => a.status === 'open');
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  return (
    <Layout title="Alertes fraude">
      <div style={s.page}>
        <div style={s.summary}>
          <div style={s.sumCard('#ef4444')}>
            <p style={s.sumNum}>{openAlerts.length}</p>
            <p style={s.sumLabel}>Alertes ouvertes</p>
          </div>
          <div style={s.sumCard('#dc2626')}>
            <p style={s.sumNum}>{criticalAlerts.length}</p>
            <p style={s.sumLabel}>Critiques / Élevées</p>
          </div>
          <div style={s.sumCard('#f59e0b')}>
            <p style={s.sumNum}>{alerts.filter(a => a.status === 'investigating').length}</p>
            <p style={s.sumLabel}>En investigation</p>
          </div>
          <div style={s.sumCard('#10b981')}>
            <p style={s.sumNum}>{alerts.filter(a => a.status === 'resolved').length}</p>
            <p style={s.sumLabel}>Résolues</p>
          </div>
        </div>

        <div style={s.card}>
          {loading ? <p style={s.loading}>Chargement...</p> : alerts.length === 0 ? <p style={s.empty}>Aucune alerte</p> : (
            <table style={s.table}>
              <thead>
                <tr>{['Client','Type alerte','Sévérité','Confiance IA','Statut','Date','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id} style={{ ...s.tr, ...(a.severity === 'critical' ? s.criticalRow : {}) }}>
                    <td style={s.td}>
                      <p style={s.clientName}>{a.client_name}</p>
                      <p style={s.clientEmail}>{a.email}</p>
                    </td>
                    <td style={s.td}>{a.alert_type}</td>
                    <td style={s.td}>
                      <span style={{ ...s.sevBadge, background:SEV_COLORS[a.severity]+'18', color:SEV_COLORS[a.severity] }}>
                        {a.severity}
                      </span>
                    </td>
                    <td style={s.td}>
                      {a.ai_confidence && <span style={{ color:'#818cf8', fontWeight:'700' }}>{a.ai_confidence}%</span>}
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.statusBadge, background:STATUS_COLORS[a.status]+'18', color:STATUS_COLORS[a.status] }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={s.td}>{new Date(a.created_at).toLocaleDateString('fr-TN')}</td>
                    <td style={s.td}>
                      {a.status === 'open' && (
                        <div style={s.actions}>
                          <button style={s.btnInv} onClick={() => resolve(a.id, 'investigating')} title="Enquêter">
                            <Eye size={12} />
                            <span>Enquêter</span>
                          </button>
                          <button style={s.btnRes} onClick={() => resolve(a.id, 'resolved')} title="Résoudre">
                            <CheckCircle size={12} />
                            <span>Résoudre</span>
                          </button>
                          <button style={s.btnFP} onClick={() => resolve(a.id, 'false_positive')} title="Faux positif">
                            <XCircle size={12} />
                            <span>Faux positif</span>
                          </button>
                        </div>
                      )}
                      {a.status === 'investigating' && (
                        <div style={s.actions}>
                          <button style={s.btnRes} onClick={() => resolve(a.id, 'resolved')}>
                            <CheckCircle size={12} />
                            <span>Résoudre</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'1200px' },
  summary: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' },
  sumCard: (color) => ({ background:`${color}10`, border:`1px solid ${color}30`, borderRadius:'16px', padding:'18px', textAlign:'center' }),
  sumNum: { fontSize:'28px', fontWeight:'800', color:'#0f172a', marginBottom:'4px' },
  sumLabel: { fontSize:'12px', color:'#374151', fontWeight:'600' },
  card: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', overflow:'auto', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  loading: { color:'#374151', textAlign:'center', padding:'40px' },
  empty: { color:'#374151', textAlign:'center', padding:'40px', fontSize:'13px', fontWeight:'500' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'900px' },
  th: { padding:'11px 13px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#374151', textTransform:'uppercase', borderBottom:'2px solid #f0f4ff', background:'#f8faff', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f0f4ff' },
  criticalRow: { background:'#fff5f5' },
  td: { padding:'10px 13px', fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  clientName: { fontSize:'13px', color:'#0f172a', fontWeight:'700' },
  clientEmail: { fontSize:'10px', color:'#374151', fontWeight:'500' },
  sevBadge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase' },
  statusBadge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' },
  actions: { display:'flex', gap:'4px', flexWrap:'wrap' },
  btnInv: { padding:'4px 10px', background:'#eff6ff', border:'none', borderRadius:'6px', color:'#2563eb', fontSize:'11px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' },
  btnRes: { padding:'4px 10px', background:'#f0fdf4', border:'none', borderRadius:'6px', color:'#15803d', fontSize:'11px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' },
  btnFP:  { padding:'4px 10px', background:'#f8faff', border:'none', borderRadius:'6px', color:'#374151', fontSize:'11px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' },
};
