import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { CheckCircle, XCircle, Clock, User, MapPin, Phone } from 'lucide-react';

export default function AdminChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const r = await api.get('/admin/change-requests');
      setRequests(r.data);
    } catch (err) {
      console.error('Failed to load change requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status, note = '') => {
    try {
      await api.patch(`/admin/change-requests/${id}`, { status, admin_note: note });
      await loadRequests(); // Reload the list
    } catch (err) {
      console.error('Failed to review request:', err);
      alert('Erreur lors de la validation de la demande');
    }
  };

  const getFieldIcon = (field) => {
    switch (field) {
      case 'phone': return <Phone size={16} />;
      case 'address':
      case 'city':
      case 'governorate': return <MapPin size={16} />;
      default: return <User size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  if (loading) {
    return (
      <Layout title="Demandes de modification">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Demandes de modification">
      <div style={s.container}>
        <div style={s.header}>
          <h2 style={s.title}>Demandes de modification de profil</h2>
          <p style={s.subtitle}>Validez ou rejetez les demandes de modification des informations sensibles des clients</p>
        </div>

        {requests.length === 0 ? (
          <div style={s.empty}>
            <CheckCircle size={48} color="#10b981" />
            <h3 style={s.emptyTitle}>Aucune demande en attente</h3>
            <p style={s.emptyText}>Toutes les demandes ont été traitées</p>
          </div>
        ) : (
          <div style={s.requestsGrid}>
            {requests.map(req => (
              <div key={req.id} style={s.requestCard}>
                <div style={s.requestHeader}>
                  <div style={s.userInfo}>
                    <div style={s.userAvatar}>
                      {req.first_name?.[0]}{req.last_name?.[0]}
                    </div>
                    <div>
                      <div style={s.userName}>{req.first_name} {req.last_name}</div>
                      <div style={s.userEmail}>{req.email}</div>
                    </div>
                  </div>
                  <div style={{ ...s.statusBadge, background: getStatusColor(req.status) + '20', color: getStatusColor(req.status) }}>
                    {req.status === 'pending' ? 'En attente' : req.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                  </div>
                </div>

                <div style={s.requestBody}>
                  <div style={s.fieldInfo}>
                    <div style={s.fieldIcon}>
                      {getFieldIcon(req.field_name)}
                    </div>
                    <div>
                      <div style={s.fieldLabel}>{req.field_label}</div>
                      <div style={s.fieldValues}>
                        <span style={s.oldValue}>{req.old_value || 'Non défini'}</span>
                        <span style={s.arrow}>→</span>
                        <span style={s.newValue}>{req.new_value}</span>
                      </div>
                    </div>
                  </div>

                  <div style={s.requestMeta}>
                    <div style={s.requestDate}>
                      Demandé le {new Date(req.created_at).toLocaleDateString('fr-TN')}
                    </div>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div style={s.requestActions}>
                    <button
                      style={{ ...s.actionBtn, ...s.approveBtn }}
                      onClick={() => handleReview(req.id, 'approved')}
                    >
                      <CheckCircle size={16} />
                      Approuver
                    </button>
                    <button
                      style={{ ...s.actionBtn, ...s.rejectBtn }}
                      onClick={() => {
                        const note = prompt('Motif du rejet (optionnel):');
                        handleReview(req.id, 'rejected', note);
                      }}
                    >
                      <XCircle size={16} />
                      Rejeter
                    </button>
                  </div>
                )}

                {req.status !== 'pending' && req.admin_note && (
                  <div style={s.adminNote}>
                    <strong>Note admin:</strong> {req.admin_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

const s = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 20px',
    background: '#f9fafb',
    borderRadius: '16px',
    border: '2px dashed #e5e7eb',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    margin: '16px 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  requestsGrid: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  },
  requestCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: '14px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  requestBody: {
    marginBottom: '20px',
  },
  fieldInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  fieldIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
  },
  fieldLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  fieldValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  oldValue: {
    color: '#ef4444',
    textDecoration: 'line-through',
  },
  arrow: {
    color: '#6b7280',
  },
  newValue: {
    color: '#10b981',
    fontWeight: '600',
  },
  requestMeta: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  requestDate: {
    marginBottom: '4px',
  },
  requestActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  },
  approveBtn: {
    background: '#10b981',
    color: 'white',
  },
  rejectBtn: {
    background: '#ef4444',
    color: 'white',
  },
  adminNote: {
    marginTop: '16px',
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    border: '1px solid #e5e7eb',
  },
};