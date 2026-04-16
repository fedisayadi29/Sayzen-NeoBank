import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { IdCard, FileText, Camera, Home, CheckCircle, Clock, XCircle, Upload, RefreshCw, Brain, ScanLine, ShieldCheck, Scale } from 'lucide-react';

const DOC_TYPES = [
  { value:'cin_front',     label:'CIN (Recto)',              Icon: IdCard,   desc:"Face avant de votre Carte d'Identité Nationale" },
  { value:'cin_back',      label:'CIN (Verso)',              Icon: IdCard,   desc:"Face arrière de votre Carte d'Identité Nationale" },
  { value:'passport',      label:'Passeport',                Icon: FileText, desc:'Page principale de votre passeport tunisien' },
  { value:'selfie',        label:'Selfie de vérification',   Icon: Camera,   desc:"Photo de vous tenant votre pièce d'identité" },
  { value:'proof_address', label:'Justificatif de domicile', Icon: Home,     desc:'Facture STEG/SONEDE ou relevé bancaire récent' },
];

const STATUS_COLORS = { pending:'#f59e0b', approved:'#10b981', rejected:'#ef4444' };
const STATUS_LABELS = { pending:'En attente', approved:'Approuvé', rejected:'Rejeté' };

export default function KYC() {
  const { user, refreshUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState('');
  const [msg, setMsg] = useState({ text:'', type:'success' });

  useEffect(() => { api.get('/user/kyc/documents').then(r => setDocuments(r.data)); }, []);

  const handleUpload = async (docType, file) => {
    if (!file) return;
    setUploading(docType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    try {
      await api.post('/user/kyc/upload', formData, { headers: { 'Content-Type':'multipart/form-data' } });
      setMsg({ text:`Document "${docType}" soumis avec succès. En cours d'analyse IA...`, type:'success' });
      api.get('/user/kyc/documents').then(r => setDocuments(r.data));
      refreshUser();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Erreur upload', type:'error' });
    } finally { setUploading(''); }
  };

  const getDocStatus = (docType) => documents.find(d => d.doc_type === docType);

  const kycSteps = [
    { label:'Inscription', done: true },
    { label:'Documents soumis', done: user?.doc_verified },
    { label:'Selfie vérifié', done: user?.face_verified },
    { label:'Vérification IA', done: user?.kyc_status === 'in_review' || user?.kyc_status === 'verified' },
    { label:'KYC validé', done: user?.kyc_status === 'verified' },
  ];

  return (
    <Layout title="Vérification KYC">
      <div style={s.page}>
        {msg.text && <div style={s.alert(msg.type)}>{msg.type==='success' ? '✓' : '⚠'} {msg.text}</div>}

        {/* KYC Status Banner */}
        <div style={s.statusBanner(user?.kyc_status)}>
          <div style={s.bannerLeft}>
            <div style={s.bannerIcon}>
              {user?.kyc_status === 'verified'  ? <CheckCircle size={32} color="#15803d" /> :
               user?.kyc_status === 'in_review' ? <ScanLine    size={32} color="#2563eb" /> :
               user?.kyc_status === 'rejected'  ? <XCircle     size={32} color="#dc2626" /> :
                                                  <Clock       size={32} color="#d97706" />}
            </div>
            <div>
              <p style={s.bannerTitle}>
                {user?.kyc_status === 'verified' ? 'Identité vérifiée' :
                 user?.kyc_status === 'in_review' ? 'Vérification en cours' :
                 user?.kyc_status === 'rejected' ? 'Vérification rejetée' :
                 'Vérification en attente'}
              </p>
              <p style={s.bannerSub}>
                {user?.kyc_status === 'verified' ? 'Votre compte est entièrement activé' :
                 user?.kyc_status === 'in_review' ? 'Nos équipes analysent vos documents (24-48h)' :
                 user?.kyc_status === 'rejected' ? 'Veuillez soumettre de nouveaux documents' :
                 'Soumettez vos documents pour activer votre compte'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div style={s.stepsRow}>
          {kycSteps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div style={s.step}>
                <div style={{ ...s.stepCircle, ...(step.done ? s.stepDone : {}) }}>
                  {step.done ? <CheckCircle size={14} color="#15803d" /> : <span style={{ fontSize:'12px', fontWeight:'700' }}>{i+1}</span>}
                </div>
                <p style={{ ...s.stepLabel, color: step.done ? '#15803d' : '#374151' }}>{step.label}</p>
              </div>
              {i < kycSteps.length - 1 && <div style={{ ...s.stepLine, background: step.done ? '#15803d' : '#e8edf8' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Document Upload */}
        <div style={s.docsGrid}>
          {DOC_TYPES.map(doc => {
            const existing = getDocStatus(doc.value);
            return (
              <div key={doc.value} style={s.docCard}>
                <div style={s.docHeader}>
                  <div style={s.docIconWrap}><doc.Icon size={20} color="#6366f1" strokeWidth={2} /></div>
                  <div style={s.docInfo}>
                    <p style={s.docLabel}>{doc.label}</p>
                    <p style={s.docDesc}>{doc.desc}</p>
                  </div>
                  {existing && (
                    <span style={{ ...s.docStatus, background: STATUS_COLORS[existing.status]+'18', color: STATUS_COLORS[existing.status] }}>
                      {STATUS_LABELS[existing.status]}
                    </span>
                  )}
                </div>

                {existing && (
                  <div style={s.docExisting}>
                    <span style={s.docFileName}>{existing.file_name}</span>
                    {existing.ai_confidence > 0 && (
                      <span style={s.aiScore}>IA: {existing.ai_confidence}%</span>
                    )}
                  </div>
                )}

                <label style={s.uploadBtn}>
                  {uploading === doc.value
                    ? <><ScanLine size={14} style={{ marginRight:'6px', verticalAlign:'middle' }} />Analyse en cours...</>
                    : existing
                    ? <><RefreshCw size={14} style={{ marginRight:'6px', verticalAlign:'middle' }} />Remplacer</>
                    : <><Upload size={14} style={{ marginRight:'6px', verticalAlign:'middle' }} />Télécharger</>
                  }
                  <input type="file" accept="image/*,.pdf" style={{ display:'none' }}
                    onChange={e => handleUpload(doc.value, e.target.files[0])}
                    disabled={uploading === doc.value} />
                </label>
              </div>
            );
          })}
        </div>

        {/* AI Info */}
        <div style={s.aiInfo}>
          <h4 style={s.aiTitle}>🤖 Vérification par Intelligence Artificielle</h4>
          <div style={s.aiFeatures}>
          {[
            { Icon: ScanLine,    text:'OCR intelligent — Lecture automatique de vos documents' },
            { Icon: ShieldCheck, text:"Détection de fraude — Vérification d'authenticité" },
            { Icon: Camera,      text:'Reconnaissance faciale — Correspondance selfie/document' },
            { Icon: Scale,       text:'Conformité BCT — Respect des normes réglementaires tunisiennes' },
          ].map(f => (
            <div key={f.text} style={s.aiFeature}>
              <f.Icon size={16} color="#6366f1" strokeWidth={2} style={{ flexShrink:0 }} />
              <span>{f.text}</span>
            </div>
          ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'900px' },
  alert: (type) => ({ background: type==='success' ? '#f0fdf4' : '#fef2f2', border:`1px solid ${type==='success' ? '#bbf7d0' : '#fecaca'}`, color: type==='success' ? '#15803d' : '#dc2626', padding:'12px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'500' }),
  statusBanner: (status) => ({ background: status==='verified' ? '#f0fdf4' : status==='in_review' ? '#eff6ff' : status==='rejected' ? '#fef2f2' : '#fffbeb', border:`1px solid ${status==='verified' ? '#bbf7d0' : status==='in_review' ? '#bfdbfe' : status==='rejected' ? '#fecaca' : '#fde68a'}`, borderRadius:'16px', padding:'20px', marginBottom:'24px' }),
  bannerLeft: { display:'flex', alignItems:'center', gap:'16px' },
  bannerIcon: { fontSize:'32px' },
  bannerTitle: { fontSize:'16px', fontWeight:'800', color:'#0f172a', marginBottom:'4px' },
  bannerSub: { fontSize:'13px', color:'#374151', fontWeight:'500' },
  stepsRow: { display:'flex', alignItems:'center', marginBottom:'28px', overflowX:'auto', paddingBottom:'4px' },
  step: { display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', minWidth:'100px' },
  stepCircle: { width:'32px', height:'32px', borderRadius:'50%', background:'#f0f4ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#374151', border:'2px solid #e8edf8' },
  stepDone: { background:'#f0fdf4', color:'#15803d', border:'2px solid #bbf7d0' },
  stepLabel: { fontSize:'11px', fontWeight:'600', textAlign:'center', color:'#374151' },
  stepLine: { flex:1, height:'2px', minWidth:'20px' },
  docsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'14px', marginBottom:'24px' },
  docCard: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', padding:'18px', display:'flex', flexDirection:'column', gap:'12px', boxShadow:'0 2px 8px rgba(99,102,241,0.05)' },
  docHeader: { display:'flex', alignItems:'flex-start', gap:'10px' },
  docIconWrap: { width:'36px', height:'36px', borderRadius:'10px', background:'#f5f3ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  docInfo: { flex:1 },
  docLabel: { fontSize:'13px', fontWeight:'700', color:'#0f172a', marginBottom:'2px' },
  docDesc: { fontSize:'11px', color:'#374151', fontWeight:'500' },
  docStatus: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', whiteSpace:'nowrap' },
  docExisting: { display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8faff', padding:'8px 10px', borderRadius:'8px', border:'1px solid #e8edf8' },
  docFileName: { fontSize:'11px', color:'#374151', fontWeight:'500' },
  aiScore: { fontSize:'11px', color:'#15803d', fontWeight:'700' },
  uploadBtn: { padding:'10px', background:'#f5f3ff', border:'2px solid #ddd6fe', borderRadius:'10px', color:'#6366f1', fontSize:'13px', fontWeight:'700', textAlign:'center', cursor:'pointer' },
  aiInfo: { background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:'16px', padding:'20px' },
  aiTitle: { fontSize:'14px', fontWeight:'800', color:'#0f172a', marginBottom:'14px' },
  aiFeatures: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' },
  aiFeature: { fontSize:'12px', color:'#1e293b', padding:'8px 12px', background:'#fff', borderRadius:'8px', fontWeight:'500', border:'1px solid #e8edf8', display:'flex', alignItems:'center', gap:'8px' },
};
