import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { Globe, Wifi, Lock, Unlock } from 'lucide-react';

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState({ text:'', type:'success' });
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    api.get('/user/cards').then(r => {
      setCards(r.data);
      if (r.data[0]) setSelected(r.data[0]);
    });
  }, []);

  const updateCard = async (id, data) => {
    try {
      await api.patch(`/user/cards/${id}`, data);
      setMsg({ text:'Carte mise à jour avec succès ✓', type:'success' });
      api.get('/user/cards').then(r => {
        setCards(r.data);
        setSelected(r.data.find(c => c.id === id));
      });
    } catch (err) { setMsg({ text: err.response?.data?.message || 'Erreur', type:'error' }); }
  };

  const toggle = (field) => { if (!selected) return; updateCard(selected.id, { [field]: !selected[field] }); };

  const cardGradient = (network, blocked) => {
    if (blocked) return 'linear-gradient(135deg,#94a3b8,#64748b)';
    if (network === 'mastercard') return 'linear-gradient(135deg,#1e293b,#7f1d1d,#991b1b)';
    return 'linear-gradient(135deg,#1e1b4b,#4f46e5,#7c3aed)';
  };

  return (
    <Layout title="Mes cartes">
      <div style={s.page}>
        {msg.text && (
          <div style={s.alert(msg.type)} className="animate-slideDown">
            {msg.text}
          </div>
        )}

        <div style={s.layout}>
          {/* Cards List */}
          <div style={s.cardsCol}>
            {cards.map(card => (
              <div key={card.id} style={{ ...s.cardWrap, ...(selected?.id===card.id ? s.cardWrapActive : {}) }}
                onClick={() => { setSelected(card); setFlipped(false); }}
                className="card-hover">

                {/* 3D Card */}
                <div style={{ ...s.cardScene, ...(flipped && selected?.id===card.id ? s.cardSceneFlipped : {}) }}
                  onClick={e => { e.stopPropagation(); if (selected?.id===card.id) setFlipped(!flipped); }}>

                  {/* Front */}
                  <div style={{ ...s.cardFace, background: cardGradient(card.network, card.is_blocked) }}>
                    <div style={s.cardShine} />
                    <div style={s.cardTop}>
                      <div style={s.cardChip}>
                        <div style={s.chipLine} />
                        <div style={s.chipLine} />
                        <div style={s.chipLine} />
                      </div>
                      <div style={s.cardNetworkBadge}>
                        {card.network === 'mastercard' ? (
                          <div style={s.mastercardCircles}>
                            <div style={{ ...s.mcCircle, background:'#eb001b' }} />
                            <div style={{ ...s.mcCircle, background:'#f79e1b', marginLeft:'-12px' }} />
                          </div>
                        ) : (
                          <span style={s.visaText}>VISA</span>
                        )}
                      </div>
                    </div>
                    <div style={s.cardNumber}>{card.card_number}</div>
                    <div style={s.cardBottom}>
                      <div>
                        <div style={s.cardFieldLabel}>Titulaire</div>
                        <div style={s.cardFieldVal}>{card.card_holder}</div>
                      </div>
                      <div>
                        <div style={s.cardFieldLabel}>Expire</div>
                        <div style={s.cardFieldVal}>{new Date(card.expiry_date).toLocaleDateString('fr-TN', { month:'2-digit', year:'2-digit' })}</div>
                      </div>
                      <div>
                        <div style={s.cardFieldLabel}>Type</div>
                        <div style={s.cardFieldVal}>{card.card_type === 'virtual' ? '🌐 Virtuelle' : '💳 Physique'}</div>
                      </div>
                    </div>
                    {card.is_blocked && (
                      <div style={s.blockedOverlay}>
                        <span style={s.blockedText}>🔒 BLOQUÉE</span>
                      </div>
                    )}
                    <div style={s.flipHint}>Cliquer pour retourner</div>
                  </div>
                </div>

                {/* Card Status */}
                <div style={s.cardMeta}>
                  <span style={s.cardTypeBadge(card.card_type)}>{card.card_type === 'virtual' ? '🌐 Virtuelle' : '💳 Physique'}</span>
                  <span style={s.cardStatusBadge(card.is_active && !card.is_blocked)}>
                    {card.is_blocked ? '🔒 Bloquée' : card.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
              </div>
            ))}

            {cards.length === 0 && (
              <div style={s.noCards}>
                <span style={s.noCardsIcon}>💳</span>
                <p style={s.noCardsText}>Aucune carte disponible</p>
              </div>
            )}
          </div>

          {/* Settings */}
          {selected && (
            <div style={s.settingsCard} className="animate-fadeInUp">
              <h3 style={s.settingsTitle}>⚙ Paramètres de la carte</h3>

              {/* Limits */}
              <div style={s.section}>
                <p style={s.sectionTitle}>Plafonds de dépenses</p>
                <div style={s.limitCard}>
                  <div style={s.limitRow}>
                    <div>
                      <p style={s.limitLabel}>Plafond journalier</p>
                      <p style={s.limitSub}>Maximum par jour</p>
                    </div>
                    <input style={s.limitInput} type="number" defaultValue={parseFloat(selected.daily_limit).toFixed(3)}
                      onBlur={e => updateCard(selected.id, { daily_limit: parseFloat(e.target.value) })} />
                  </div>
                  <div style={s.limitRow}>
                    <div>
                      <p style={s.limitLabel}>Plafond mensuel</p>
                      <p style={s.limitSub}>Maximum par mois</p>
                    </div>
                    <input style={s.limitInput} type="number" defaultValue={parseFloat(selected.monthly_limit).toFixed(3)}
                      onBlur={e => updateCard(selected.id, { monthly_limit: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div style={s.section}>
                <p style={s.sectionTitle}>Options de paiement</p>
                {[
                  { key:'online_payments', label:'Paiements en ligne',        Icon: Globe,  desc:'E-commerce et achats web' },
                  { key:'contactless',     label:'Sans contact (NFC)',         Icon: Wifi,   desc:'Paiement par approche' },
                  { key:'international',   label:'Paiements internationaux',   Icon: Globe,  desc:'Hors Tunisie' },
                ].map(opt => (
                  <div key={opt.key} style={s.toggleRow} className="card-hover">
                    <div style={s.toggleLeft}>
                      <div style={s.toggleIcon}><opt.Icon size={18} color="#6366f1" strokeWidth={2} /></div>
                      <div>
                        <p style={s.toggleLabel}>{opt.label}</p>
                        <p style={s.toggleDesc}>{opt.desc}</p>
                      </div>
                    </div>
                    <div style={{ ...s.toggle, ...(selected[opt.key] ? s.toggleOn : {}) }}
                      onClick={() => toggle(opt.key)}>
                      <div style={{ ...s.toggleThumb, ...(selected[opt.key] ? s.toggleThumbOn : {}) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Block */}
              <button
                style={s.blockBtn(selected.is_blocked)}
                onClick={() => updateCard(selected.id, { is_blocked: !selected.is_blocked, block_reason: selected.is_blocked ? null : 'Bloquée par le client' })}
                className="btn-ripple">
                {selected.is_blocked
                  ? <><Unlock size={16} style={{ marginRight:'8px', verticalAlign:'middle' }} />Débloquer la carte</>
                  : <><Lock size={16} style={{ marginRight:'8px', verticalAlign:'middle' }} />Bloquer la carte</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth:'960px' },
  alert: (type) => ({ background: type==='success' ? '#f0fdf4' : '#fef2f2', border:`1px solid ${type==='success' ? '#bbf7d0' : '#fecaca'}`, color: type==='success' ? '#16a34a' : '#dc2626', padding:'12px 16px', borderRadius:'12px', marginBottom:'20px', fontSize:'13px', fontWeight:'500' }),
  layout: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' },
  cardsCol: { display:'flex', flexDirection:'column', gap:'20px' },
  cardWrap: { cursor:'pointer', transition:'all 0.3s', padding:'4px', borderRadius:'24px', border:'2px solid transparent' },
  cardWrapActive: { border:'2px solid #6366f1', background:'#f5f3ff' },
  cardScene: { perspective:'1000px', transition:'transform 0.6s' },
  cardSceneFlipped: { transform:'rotateY(180deg)' },
  cardFace: { borderRadius:'20px', padding:'24px', aspectRatio:'1.586', display:'flex', flexDirection:'column', justifyContent:'space-between', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', position:'relative', overflow:'hidden', transition:'all 0.3s' },
  cardShine: { position:'absolute', top:'-50%', left:'-50%', width:'200%', height:'200%', background:'linear-gradient(135deg,rgba(255,255,255,0.1) 0%,transparent 50%)', pointerEvents:'none' },
  cardTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  cardChip: { width:'36px', height:'28px', background:'linear-gradient(135deg,#fbbf24,#f59e0b)', borderRadius:'6px', display:'flex', flexDirection:'column', justifyContent:'center', gap:'4px', padding:'4px 6px' },
  chipLine: { height:'2px', background:'rgba(0,0,0,0.2)', borderRadius:'1px' },
  cardNetworkBadge: { display:'flex', alignItems:'center' },
  mastercardCircles: { display:'flex', alignItems:'center' },
  mcCircle: { width:'28px', height:'28px', borderRadius:'50%', opacity:0.9 },
  visaText: { fontSize:'22px', fontWeight:'900', color:'rgba(255,255,255,0.95)', fontStyle:'italic', letterSpacing:'2px' },
  cardNumber: { fontSize:'16px', letterSpacing:'4px', color:'rgba(255,255,255,0.95)', fontFamily:'monospace', fontWeight:'600', textAlign:'center', textShadow:'0 1px 3px rgba(0,0,0,0.3)' },
  cardBottom: { display:'flex', gap:'20px' },
  cardFieldLabel: { fontSize:'9px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'2px' },
  cardFieldVal: { fontSize:'12px', color:'#fff', fontWeight:'600' },
  blockedOverlay: { position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'20px', backdropFilter:'blur(4px)' },
  blockedText: { fontSize:'18px', fontWeight:'800', color:'#fff', letterSpacing:'2px' },
  flipHint: { position:'absolute', bottom:'8px', right:'12px', fontSize:'9px', color:'rgba(255,255,255,0.4)' },
  cardMeta: { display:'flex', gap:'8px', marginTop:'10px', justifyContent:'center' },
  cardTypeBadge: (type) => ({ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background: type==='virtual' ? '#ede9fe' : '#fef3c7', color: type==='virtual' ? '#7c3aed' : '#d97706' }),
  cardStatusBadge: (active) => ({ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background: active ? '#f0fdf4' : '#fef2f2', color: active ? '#16a34a' : '#dc2626' }),
  noCards: { display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 20px', gap:'12px' },
  noCardsIcon: { fontSize:'48px', opacity:0.3 },
  noCardsText: { color:'#94a3b8', fontSize:'14px' },
  settingsCard: { background:'#fff', border:'1px solid #f0f4ff', borderRadius:'20px', padding:'24px', boxShadow:'0 4px 20px rgba(99,102,241,0.08)', height:'fit-content' },
  settingsTitle: { fontSize:'16px', fontWeight:'700', color:'#1e293b', marginBottom:'20px' },
  section: { marginBottom:'20px' },
  sectionTitle: { fontSize:'11px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px' },
  limitCard: { background:'#f8faff', borderRadius:'14px', padding:'14px', display:'flex', flexDirection:'column', gap:'12px' },
  limitRow: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  limitLabel: { fontSize:'13px', color:'#1e293b', fontWeight:'600' },
  limitSub: { fontSize:'11px', color:'#94a3b8' },
  limitInput: { width:'110px', padding:'8px 12px', background:'#fff', border:'2px solid #e8edf8', borderRadius:'10px', color:'#1e293b', fontSize:'13px', outline:'none', textAlign:'right', fontWeight:'600' },
  toggleRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', borderRadius:'12px', marginBottom:'6px', background:'#f8faff', cursor:'pointer' },
  toggleLeft: { display:'flex', alignItems:'center', gap:'10px' },
  toggleIcon: { fontSize:'20px', width:'36px', height:'36px', background:'#fff', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.06)' },
  toggleLabel: { fontSize:'13px', color:'#1e293b', fontWeight:'600' },
  toggleDesc: { fontSize:'11px', color:'#94a3b8' },
  toggle: { width:'44px', height:'24px', borderRadius:'12px', background:'#e2e8f0', position:'relative', cursor:'pointer', transition:'background 0.25s', flexShrink:0 },
  toggleOn: { background:'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  toggleThumb: { position:'absolute', top:'3px', left:'3px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 2px 4px rgba(0,0,0,0.15)' },
  toggleThumbOn: { left:'23px' },
  blockBtn: (blocked) => ({ width:'100%', padding:'13px', background: blocked ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow: blocked ? '0 4px 16px rgba(16,185,129,0.3)' : '0 4px 16px rgba(239,68,68,0.3)', transition:'all 0.2s' }),
};
