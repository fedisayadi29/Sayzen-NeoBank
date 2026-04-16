import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';

const ACTION_COLORS = { USER_REGISTER:'#10b981', USER_ACTIVATE:'#10b981', USER_SUSPEND:'#ef4444', KYC_UPDATE:'#3b82f6', ADMIN_DEPOSIT:'#f59e0b', PASSWORD_CHANGE:'#8b5cf6' };

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit-logs?limit=100').then(r => setLogs(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Audit & Logs">
      <div style={s.page}>
        <div style={s.card}>
          {loading ? <p style={s.loading}>Chargement...</p> : logs.length === 0 ? <p style={s.empty}>Aucun log</p> : (
            <table style={s.table}>
              <thead>
                <tr>{['Date','Action','Utilisateur','Admin','Entité','Détails'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={s.tr}>
                    <td style={s.td}>{new Date(log.created_at).toLocaleString('fr-TN')}</td>
                    <td style={s.td}>
                      <span style={{ ...s.actionBadge, background:(ACTION_COLORS[log.action]||'#64748b')+'18', color:ACTION_COLORS[log.action]||'#64748b' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={s.td}>{log.user_name||'-'}</td>
                    <td style={s.td}>{log.admin_name||'-'}</td>
                    <td style={s.td}>{log.entity_type||'-'}</td>
                    <td style={s.td}>
                      {log.details && (
                        <code style={s.details}>{JSON.stringify(log.details).slice(0,60)}</code>
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
  card: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', overflow:'auto', boxShadow:'0 2px 12px rgba(99,102,241,0.06)' },
  loading: { color:'#374151', textAlign:'center', padding:'40px' },
  empty: { color:'#374151', textAlign:'center', padding:'40px', fontSize:'13px', fontWeight:'500' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'900px' },
  th: { padding:'11px 13px', textAlign:'left', fontSize:'10px', fontWeight:'700', color:'#374151', textTransform:'uppercase', borderBottom:'2px solid #f0f4ff', background:'#f8faff', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f0f4ff' },
  td: { padding:'10px 13px', fontSize:'12px', color:'#1e293b', fontWeight:'500' },
  actionBadge: { padding:'3px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700' },
  details: { background:'#f5f3ff', color:'#7c3aed', padding:'2px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:'600' },
};
