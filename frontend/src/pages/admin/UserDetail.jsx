import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { ArrowLeft, User, Mail, Phone, MapPin, CreditCard, TrendingUp, Shield, IdCard, FileText, Camera, Home, CheckCircle, XCircle, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loans, setLoans] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [accessLogs, setAccessLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    try {
      const [userRes, analyticsRes, logsRes] = await Promise.all([
        api.get(`/admin/users/${id}`),
        api.get(`/admin/users/${id}/analytics`),
        api.get(`/admin/users/${id}/access-logs`)
      ]);
      setUser(userRes.data.user);
      setAccounts(userRes.data.accounts || []);
      setCards(userRes.data.cards || []);
      setLoans(userRes.data.loans || []);
      setDocuments(userRes.data.documents || []);
      setChangeRequests(userRes.data.change_requests || []);
      setTransactions(userRes.data.transactions || []);
      setAnalytics(analyticsRes.data);
      setAccessLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    try {
      await api.patch(`/admin/users/${id}/toggle`);
      setUser({ ...user, is_active: !user.is_active });
    } catch (err) {
      alert('Erreur lors de la modification du statut');
    }
  };

  const handleLockToggle = async () => {
    try {
      await api.patch(`/admin/users/${id}/lock`);
      setUser({ ...user, is_locked: !user.is_locked });
    } catch (err) {
      alert('Erreur lors de la modification du verrouillage');
    }
  };

  const handleReviewDoc = async (docId, status, reason = '') => {
    try {
      const r = await api.patch(`/admin/kyc-documents/${docId}/review`, {
        status,
        rejection_reason: reason || undefined,
      });
      // Refresh user data to get updated KYC status and documents
      await loadUserData();
      alert(r.data.message + (r.data.kyc_status ? ` — KYC: ${r.data.kyc_status}` : ''));
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la révision');
    }
  };

  if (loading) {
    return (
      <Layout title="Détail utilisateur">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title="Utilisateur introuvable">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Utilisateur introuvable</div>
          <Link to="/admin/users" style={{ color: '#6366f1', textDecoration: 'none', marginTop: '20px', display: 'inline-block' }}>
            ← Retour à la liste
          </Link>
        </div>
      </Layout>
    );
  }

  const kycColors = { verified: '#10b981', pending: '#f59e0b', in_review: '#3b82f6', rejected: '#ef4444' };
  const riskColors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };

  const spendingData = (analytics?.monthly || []).map(m => ({
    month: (m.month || '').slice(0, 7),
    income: parseFloat(m.income || 0),
    total: parseFloat(m.expenses || 0),
  }));
  const categoryData = (analytics?.categories || []).slice(0, 10).map(c => ({
    category: c.category || 'Autre',
    total: parseFloat(c.total || 0),
    count: c.count || 0,
  }));

  return (
    <Layout title={`Utilisateur: ${user.first_name} ${user.last_name}`}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <Link to="/admin/users" style={s.backBtn}>
            <ArrowLeft size={16} />
            Retour
          </Link>
          <div style={s.userHeader}>
            <div style={s.avatar}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div>
              <h1 style={s.userName}>{user.first_name} {user.last_name}</h1>
              <p style={s.userEmail}>{user.email}</p>
            </div>
          </div>
          <div style={s.actions}>
            <button
              style={{ ...s.actionBtn, background: user.is_active ? '#ef4444' : '#10b981' }}
              onClick={handleStatusToggle}
            >
              {user.is_active ? 'Suspendre' : 'Activer'}
            </button>
            <button
              style={{ ...s.actionBtn, background: user.is_locked ? '#10b981' : '#ef4444' }}
              onClick={handleLockToggle}
            >
              {user.is_locked ? 'Déverrouiller' : 'Verrouiller'}
            </button>
          </div>
        </div>

        {/* User Info Cards */}
        <div style={s.infoGrid}>
          <div style={s.infoCard}>
            <div style={s.cardHeader}>
              <User size={20} color="#6366f1" />
              <h3>Informations personnelles</h3>
            </div>
            <div style={s.infoList}>
              <div style={s.infoRow}>
                <Mail size={14} />
                <span>{user.email}</span>
              </div>
              <div style={s.infoRow}>
                <Phone size={14} />
                <span>{user.phone || 'Non défini'}</span>
              </div>
              <div style={s.infoRow}>
                <MapPin size={14} />
                <span>{user.address ? `${user.address}, ${user.city || ''}, ${user.governorate || ''}` : 'Non défini'}</span>
              </div>
              <div style={s.infoRow}>
                <Shield size={14} />
                <span>CIN: {user.cin || 'Non défini'}</span>
              </div>
              <div style={s.infoRow}>
                <MapPin size={14} />
                <span>Code postal: {user.postal_code || 'Non défini'}</span>
              </div>
              <div style={s.infoRow}>
                <Shield size={14} />
                <span>Inscrit le {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-TN') : '—'}</span>
              </div>
            </div>
          </div>

          <div style={s.infoCard}>
            <div style={s.cardHeader}>
              <CreditCard size={20} color="#10b981" />
              <h3>Comptes & Cartes</h3>
            </div>
            <div style={s.stats}>
              <div style={s.stat}>
                <span style={s.statValue}>{analytics?.accounts?.length || 0}</span>
                <span style={s.statLabel}>Comptes</span>
              </div>
              <div style={s.stat}>
                <span style={s.statValue}>{analytics?.cards?.length || 0}</span>
                <span style={s.statLabel}>Cartes</span>
              </div>
              <div style={s.stat}>
                <span style={s.statValue}>{analytics?.transaction_stats?.total_transactions || 0}</span>
                <span style={s.statLabel}>Transactions</span>
              </div>
            </div>
          </div>

          <div style={s.infoCard}>
            <div style={s.cardHeader}>
              <TrendingUp size={20} color="#f59e0b" />
              <h3>Score & Risque</h3>
            </div>
            <div style={s.scoreSection}>
              <div style={s.scoreItem}>
                <span style={s.scoreLabel}>Score de crédit</span>
                <span style={s.scoreValue}>{user.credit_score}</span>
                <div style={s.scoreBar}>
                  <div style={{ ...s.scoreFill, width: `${(user.credit_score / 850) * 100}%` }} />
                </div>
              </div>
              <div style={s.scoreItem}>
                <span style={s.scoreLabel}>Niveau de risque</span>
                <span style={{ ...s.scoreValue, color: riskColors[user.risk_level] }}>
                  {user.risk_level?.toUpperCase()}
                </span>
              </div>
              <div style={s.scoreItem}>
                <span style={s.scoreLabel}>KYC Status</span>
                <span style={{ ...s.scoreValue, color: kycColors[user.kyc_status] }}>
                  {user.kyc_status === 'verified' ? 'Vérifié' :
                   user.kyc_status === 'in_review' ? 'En révision' :
                   user.kyc_status === 'pending' ? 'En attente' : 'Rejeté'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={s.detailGrid}>
          <div style={s.detailCard}>
            <p style={s.detailLabel}>Comptes actifs</p>
            <p style={s.detailValue}>{accounts.length}</p>
            <span style={s.detailMeta}>{accounts.map(a => a.account_type).join(', ') || 'Aucun compte'}</span>
          </div>
          <div style={s.detailCard}>
            <p style={s.detailLabel}>Cartes émises</p>
            <p style={s.detailValue}>{cards.length}</p>
            <span style={s.detailMeta}>{cards.length ? cards.map(c => c.network.toUpperCase()).join(', ') : 'Aucune carte'}</span>
          </div>
          <div style={s.detailCard}>
            <p style={s.detailLabel}>Crédits</p>
            <p style={s.detailValue}>{loans.length}</p>
            <span style={s.detailMeta}>{loans.length ? loans[0].loan_type : 'Aucun crédit'}</span>
          </div>
          <div style={s.detailCard}>
            <p style={s.detailLabel}>Demandes de modification</p>
            <p style={s.detailValue}>{changeRequests.length}</p>
            <span style={s.detailMeta}>{changeRequests.filter(r => r.status === 'pending').length} en attente</span>
          </div>
        </div>

        <div style={s.sectionRow}>
          <div style={s.accountsPanel}>
            <h3 style={s.sectionTitle}>Comptes bancaires</h3>
            {accounts.length === 0 ? (
              <p style={s.empty}>Aucun compte trouvé pour ce client.</p>
            ) : (
              <div style={s.accountsGrid}>
                {accounts.map(acc => (
                  <div key={acc.id} style={s.accountCard}>
                    <div style={s.accountHeader}>
                      <strong>{acc.account_type?.charAt(0).toUpperCase() + acc.account_type?.slice(1) || 'Compte'}</strong>
                      <span style={s.accountStatus}>{acc.is_active ? 'Actif' : 'Inactif'}</span>
                    </div>
                    <p style={s.accountLine}>N° compte: <strong>{acc.account_number}</strong></p>
                    <p style={s.accountLine}>Solde: <strong>{parseFloat(acc.balance).toLocaleString('fr-TN', { minimumFractionDigits:3 })} TND</strong></p>
                    <p style={s.accountLine}>RIB: <strong>{acc.rib || '—'}</strong></p>
                    <p style={s.accountLine}>IBAN: <strong>{acc.iban || '—'}</strong></p>
                    <p style={s.accountLine}>Devise: <strong>{acc.currency || 'TND'}</strong></p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.accountsPanel}>
            <h3 style={s.sectionTitle}>Crédits</h3>
            {loans.length === 0 ? (
              <p style={s.empty}>Aucun crédit enregistré pour ce client.</p>
            ) : (
              <div style={s.loanGrid}>
                {loans.map(loan => (
                  <div key={loan.id} style={s.loanCard}>
                    <div style={s.loanHeader}>
                      <strong>{loan.loan_type || 'Crédit'}</strong>
                      <span style={s.loanStatus}>{loan.status}</span>
                    </div>
                    <p style={s.loanLine}>Montant demandé: <strong>{parseFloat(loan.amount_requested).toLocaleString('fr-TN', { minimumFractionDigits:3 })} TND</strong></p>
                    <p style={s.loanLine}>Montant approuvé: <strong>{loan.amount_approved ? parseFloat(loan.amount_approved).toLocaleString('fr-TN', { minimumFractionDigits:3 }) + ' TND' : 'En attente'}</strong></p>
                    {loan.term_months && <p style={s.loanLine}>Durée: <strong>{loan.term_months} mois</strong></p>}
                    {loan.monthly_payment && <p style={s.loanLine}>Mensualité: <strong>{parseFloat(loan.monthly_payment).toLocaleString('fr-TN', { minimumFractionDigits:3 })} TND</strong></p>}
                    <p style={s.loanLine}>Date de demande: <strong>{new Date(loan.created_at).toLocaleDateString('fr-TN')}</strong></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={s.accountsPanel}>
          <h3 style={s.sectionTitle}>Transactions récentes</h3>
          {transactions.length === 0 ? (
            <p style={s.empty}>Aucune transaction trouvée pour ce client.</p>
          ) : (
            <div style={s.transactionsGrid}>
              {transactions.slice(0, 10).map(tx => (
                <div key={tx.id} style={s.transactionCard}>
                  <div style={s.transactionHeader}>
                    <strong>{tx.type}</strong>
                    <span style={s.transactionStatus}>{tx.status}</span>
                  </div>
                  <p style={s.transactionLine}>Montant: <strong>{parseFloat(tx.amount).toLocaleString('fr-TN', { minimumFractionDigits:3 })} TND</strong></p>
                  <p style={s.transactionLine}>Description: <strong>{tx.description || '—'}</strong></p>
                  <p style={s.transactionLine}>De: <strong>{tx.from_account || '—'}</strong></p>
                  <p style={s.transactionLine}>Vers: <strong>{tx.to_account || '—'}</strong></p>
                  <p style={s.transactionLine}>Date: <strong>{new Date(tx.created_at).toLocaleDateString('fr-TN')}</strong></p>
                </div>
              ))}
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <div style={s.docsCard}>
            <h3 style={s.sectionTitle}>Documents KYC — Vérification d'identité</h3>
            <div style={s.docsGrid}>
              {documents.map(doc => {
                const docConfig = {
                  cin_front:     { label:'CIN (Recto)',              Icon: IdCard,   color:'#6366f1' },
                  cin_back:      { label:'CIN (Verso)',              Icon: IdCard,   color:'#8b5cf6' },
                  passport:      { label:'Passeport',                Icon: FileText, color:'#10b981' },
                  selfie:        { label:'Selfie',                   Icon: Camera,   color:'#f59e0b' },
                  proof_address: { label:'Justificatif de domicile', Icon: Home,     color:'#06b6d4' },
                };
                const cfg = docConfig[doc.doc_type] || { label: doc.doc_type, Icon: FileText, color:'#64748b' };
                const statusColors = { pending:'#f59e0b', approved:'#10b981', rejected:'#ef4444' };
                const statusLabels = { pending:'En attente', approved:'Approuvé', rejected:'Rejeté' };
                const imgUrl = doc.file_url ? `http://localhost:5000${doc.file_url}` : null;
                const isPdf  = doc.file_name?.toLowerCase().endsWith('.pdf');
                
                return (
                  <div key={doc.id} style={s.kycDocCard}>
                    {/* Header with icon + status */}
                    <div style={s.kycDocHeader}>
                      <div style={{ ...s.kycDocIcon, background: cfg.color+'15', color: cfg.color }}>
                        <cfg.Icon size={20} strokeWidth={2} />
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={s.kycDocLabel}>{cfg.label}</p>
                        <p style={s.kycDocDate}>{new Date(doc.created_at).toLocaleDateString('fr-TN', { day:'2-digit', month:'short', year:'numeric' })}</p>
                      </div>
                      <span style={{ ...s.kycStatusBadge, background: (statusColors[doc.status]||'#e8edf8')+'20', color: statusColors[doc.status]||'#374151' }}>
                        {statusLabels[doc.status] || doc.status}
                      </span>
                    </div>

                    {/* Image preview */}
                    {imgUrl && !isPdf && (
                      <a href={imgUrl} target="_blank" rel="noreferrer" style={s.kycPreviewWrap}>
                        <img src={imgUrl} alt={cfg.label} style={s.kycPreviewImg}
                          onError={e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }} />
                        <div style={{ ...s.kycNoFile, display:'none' }}>Fichier introuvable</div>
                        <div style={s.kycPreviewOverlay}>
                          <Eye size={20} color="#fff" />
                          <span>Voir le document</span>
                        </div>
                      </a>
                    )}
                    {imgUrl && isPdf && (
                      <a href={imgUrl} target="_blank" rel="noreferrer" style={s.kycPdfBtn}>
                        <FileText size={16} style={{ marginRight:'6px' }} />
                        Ouvrir le PDF
                      </a>
                    )}
                    {!imgUrl && (
                      <div style={s.kycNoFile}>
                        <FileText size={24} color="#cbd5e1" />
                        <span>Document non disponible</span>
                      </div>
                    )}

                    {/* AI Score */}
                    {doc.ai_confidence > 0 && (
                      <div style={s.kycAiScore}>
                        <span style={s.kycAiLabel}>Score IA</span>
                        <div style={s.kycAiBar}>
                          <div style={{ ...s.kycAiBarFill, width:`${doc.ai_confidence}%`, background: doc.ai_confidence >= 80 ? '#10b981' : doc.ai_confidence >= 60 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span style={s.kycAiVal}>{doc.ai_confidence}%</span>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {doc.rejection_reason && (
                      <div style={s.kycRejection}>
                        <XCircle size={14} style={{ flexShrink:0 }} />
                        <span>{doc.rejection_reason}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {doc.status === 'pending' && imgUrl && (
                      <div style={s.kycActions}>
                        <button style={s.kycApproveBtn} onClick={() => handleReviewDoc(doc.id, 'approved')}>
                          <CheckCircle size={16} style={{ marginRight:'6px' }} />
                          Approuver
                        </button>
                        <button style={s.kycRejectBtn} onClick={() => {
                          const reason = prompt('Motif du rejet (optionnel):');
                          if (reason !== null) handleReviewDoc(doc.id, 'rejected', reason || 'Document non conforme');
                        }}>
                          <XCircle size={16} style={{ marginRight:'6px' }} />
                          Rejeter
                        </button>
                      </div>
                    )}
                    {doc.status === 'pending' && !imgUrl && (
                      <div style={s.kycWaiting}>
                        En attente de soumission par le client
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cards.length > 0 && (
          <div style={s.docsCard}>
            <h3 style={s.sectionTitle}>Cartes</h3>
            <div style={s.cardsGrid}>
              {cards.map(card => (
                <div key={card.id} style={s.cardItem}>
                  <p style={s.cardLabel}>{card.card_holder}</p>
                  <p style={s.cardNumber}>**** **** **** {card.card_number.replace(/\s/g,'').slice(-4)}</p>
                  <p style={s.cardMeta}>{card.network.toUpperCase()} • {card.card_type}</p>
                  <p style={s.cardMeta}>{card.is_blocked ? 'Bloquée' : card.is_active ? 'Active' : 'Désactivée'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Charts */}
        <div style={s.chartsGrid}>
          <div style={s.chartCard}>
            <h3 style={s.chartTitle}>Dépenses par catégorie</h3>
            {categoryData.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 28)}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0)} />
                  <YAxis type="category" dataKey="category" stroke="#374151" fontSize={11} width={100} fontWeight="600" />
                  <Tooltip
                    contentStyle={{ background:'#fff', border:'1px solid #e8edf8', borderRadius:'10px', fontSize:'12px' }}
                    formatter={(value) => [`${parseFloat(value).toFixed(3)} TND`, 'Total dépensé']}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={s.chartCard}>
            <h3 style={s.chartTitle}>Évolution mensuelle — Revenus vs Dépenses</h3>
            {spendingData.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={spendingData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                  <XAxis dataKey="month" stroke="#374151" fontSize={10} fontWeight="600" />
                  <YAxis stroke="#374151" fontSize={10} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v.toFixed(0)} />
                  <Tooltip
                    contentStyle={{ background:'#fff', border:'1px solid #e8edf8', borderRadius:'10px', fontSize:'12px' }}
                    formatter={(value, name) => [`${parseFloat(value).toFixed(3)} TND`, name === 'income' ? 'Revenus' : 'Dépenses']}
                  />
                  <Bar dataKey="income" name="income" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="total"  name="total"  fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Access Logs */}
        <div style={s.logsCard}>
          <h3 style={s.chartTitle}>Logs d'accès récents</h3>
          <div style={s.logsList}>
            {accessLogs.length === 0 ? (
              <p style={s.noLogs}>Aucun log d'accès disponible</p>
            ) : (
              accessLogs.map(log => (
                <div key={log.id} style={s.logItem}>
                  <div style={s.logInfo}>
                    <div style={s.logAction}>{log.action}</div>
                    <div style={s.logDetails}>
                      {log.ip_address} • {log.device_info} • {log.location}
                    </div>
                  </div>
                  <div style={s.logMeta}>
                    <div style={{
                      ...s.riskScore,
                      background: log.risk_score > 50 ? '#ef4444' : log.risk_score > 20 ? '#f59e0b' : '#10b981'
                    }}>
                      Risque: {log.risk_score}
                    </div>
                    <div style={s.logTime}>
                      {new Date(log.created_at).toLocaleDateString('fr-TN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#6366f1',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    padding: '8px 12px',
    borderRadius: '8px',
    background: '#f3f4f6',
    transition: 'all 0.2s ease',
  },
  userHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '20px',
  },
  userName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  userEmail: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  infoCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#374151',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    textAlign: 'center',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  scoreSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  scoreItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  scoreBar: {
    width: '100%',
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    marginTop: '8px',
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981)',
    borderRadius: '4px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  detailCard: {
    background: '#ffffff',
    border: '1px solid #e8edf8',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 8px rgba(99,102,241,0.06)',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: '8px',
  },
  detailValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '8px',
  },
  detailMeta: {
    fontSize: '12px',
    color: '#6b7280',
    display: 'block',
    marginTop: '4px',
  },
  sectionRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  accountsPanel: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #e8edf8',
    boxShadow: '0 4px 8px rgba(99,102,241,0.06)',
  },
  accountsGrid: {
    display: 'grid',
    gap: '16px',
  },
  accountCard: {
    background: '#f8faff',
    borderRadius: '16px',
    border: '1px solid #e8edf8',
    padding: '16px',
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  accountStatus: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: '#eef2ff',
    color: '#4338ca',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  accountLine: {
    fontSize: '13px',
    color: '#374151',
    margin: '6px 0',
  },
  loanGrid: {
    display: 'grid',
    gap: '16px',
  },
  loanCard: {
    background: '#f8fafc',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '16px',
  },
  loanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  loanStatus: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: '#eef2ff',
    color: '#1d4ed8',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  loanLine: {
    fontSize: '13px',
    color: '#374151',
    margin: '5px 0',
  },
  docsCard: {
    background: '#ffffff',
    border: '1px solid #e8edf8',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 4px 8px rgba(99,102,241,0.06)',
  },
  kycDocCard: {
    background: '#fff',
    border: '1px solid #e8edf8',
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 2px 8px rgba(99,102,241,0.04)',
    transition: 'all 0.2s',
  },
  kycDocHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },
  kycDocIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kycDocLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '2px',
  },
  kycDocDate: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  kycStatusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  kycPreviewWrap: {
    display: 'block',
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '12px',
    cursor: 'pointer',
    border: '1px solid #e8edf8',
  },
  kycPreviewImg: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    display: 'block',
  },
  kycPreviewOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '700',
    transition: 'background 0.2s',
    opacity: 0,
  },
  kycPdfBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: '700',
    textDecoration: 'none',
    marginBottom: '12px',
  },
  kycNoFile: {
    height: '120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#f8faff',
    borderRadius: '12px',
    border: '1px dashed #e8edf8',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '12px',
  },
  kycAiScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: '#f5f3ff',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  kycAiLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kycAiBar: {
    flex: 1,
    height: '6px',
    background: '#e8edf8',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  kycAiBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s',
  },
  kycAiVal: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#6366f1',
  },
  kycRejection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    color: '#dc2626',
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '10px',
  },
  kycActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '14px',
  },
  kycApproveBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px',
    background: 'linear-gradient(135deg,#10b981,#059669)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
    transition: 'all 0.2s',
  },
  kycRejectBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px',
    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
    transition: 'all 0.2s',
  },
  kycWaiting: {
    padding: '10px 12px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    color: '#92400e',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: '10px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '14px',
  },
  docsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  docItem: {
    padding: '16px',
    background: '#f8faff',
    borderRadius: '14px',
    border: '1px solid #e8edf8',
  },
  docPreviewWrap: {
    display: 'block', position: 'relative', borderRadius: '10px', overflow: 'hidden',
    cursor: 'pointer', textDecoration: 'none',
  },
  docPreviewImg: {
    width: '100%', height: '140px', objectFit: 'cover', display: 'block', borderRadius: '10px',
  },
  docPreviewOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px',
    fontWeight: '700', transition: 'background 0.2s',
  },
  docPdfLink: {
    display: 'block', padding: '12px', background: '#eff6ff', borderRadius: '10px',
    color: '#2563eb', fontSize: '13px', fontWeight: '700', textDecoration: 'none',
    textAlign: 'center', marginBottom: '4px',
  },
  docNoPreview: {
    height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f0f4ff', borderRadius: '10px', color: '#94a3b8', fontSize: '12px',
    fontWeight: '500', marginBottom: '4px',
  },
  docTag: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: '700',
    marginBottom: '10px',
  },
  docName: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: '6px',
  },
  docStatus: {
    fontSize: '12px',
    color: '#374151',
    marginBottom: '4px',
  },
  docDate: {
    fontSize: '11px',
    color: '#6b7280',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  cardItem: {
    background: '#f8faff',
    borderRadius: '16px',
    border: '1px solid #e8edf8',
    padding: '16px',
  },
  cardLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '6px',
  },
  cardNumber: {
    fontSize: '13px',
    letterSpacing: '1px',
    color: '#0f172a',
    marginBottom: '8px',
  },
  cardMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  transactionsGrid: {
    display: 'grid',
    gap: '12px',
  },
  transactionCard: {
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '14px',
  },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  transactionStatus: {
    padding: '3px 8px',
    borderRadius: '999px',
    background: '#eef2ff',
    color: '#1d4ed8',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  transactionLine: {
    fontSize: '12px',
    color: '#374151',
    margin: '4px 0',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '32px',
  },
  chartCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(99,102,241,0.06)',
    border: '1px solid #e8edf8',
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '20px',
  },
  logsCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  noLogs: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    padding: '40px',
  },
  logItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },
  logDetails: {
    fontSize: '12px',
    color: '#6b7280',
  },
  logMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  riskScore: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
  },
  logTime: {
    fontSize: '11px',
    color: '#9ca3af',
  },
};  
