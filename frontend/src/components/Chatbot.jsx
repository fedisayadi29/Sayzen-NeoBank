import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { MessageSquare, X, Send, Bot } from 'lucide-react';

const QUICK_REPLIES = [
  'Quel est mon solde ?',
  'Comment faire un virement ?',
  'Mes dernières transactions',
  'Demander un crédit',
  'Payer une facture',
  'Bloquer ma carte',
];

const BOT_RESPONSES = {
  solde: async (api) => {
    try {
      const r = await api.get('/user/accounts');
      const total = r.data.reduce((s, a) => s + parseFloat(a.balance), 0);
      return `Votre solde total est de **${total.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND**.\n\nVous avez ${r.data.length} compte(s) actif(s).`;
    } catch { return "Je n'arrive pas à récupérer votre solde. Veuillez réessayer."; }
  },
  transactions: async (api) => {
    try {
      const r = await api.get('/user/transactions?limit=3');
      if (!r.data.length) return "Vous n'avez pas encore de transactions.";
      const list = r.data.map(t => `• ${t.description || t.type} — ${parseFloat(t.amount).toFixed(3)} TND`).join('\n');
      return `Vos 3 dernières transactions :\n\n${list}`;
    } catch { return "Impossible de récupérer vos transactions."; }
  },
};

const getResponse = async (message, apiInstance) => {
  const msg = message.toLowerCase();

  if (msg.includes('solde') || msg.includes('balance') || msg.includes('argent')) {
    return await BOT_RESPONSES.solde(apiInstance);
  }
  if (msg.includes('transaction') || msg.includes('historique') || msg.includes('opération')) {
    return await BOT_RESPONSES.transactions(apiInstance);
  }
  if (msg.includes('virement') || msg.includes('envoyer') || msg.includes('transférer')) {
    return "Pour effectuer un virement :\n\n1. Allez dans **Virements** dans le menu\n2. Choisissez le type (interne, interbancaire, SWIFT)\n3. Entrez le RIB ou IBAN du destinataire\n4. Saisissez le montant et confirmez\n\nLes virements internes sont **instantanés et gratuits**.";
  }
  if (msg.includes('crédit') || msg.includes('prêt') || msg.includes('emprunt')) {
    return "Sayzen Bank propose plusieurs types de crédits :\n\n• **Personnel** — 8.5% / an\n• **Auto** — 7.2% / an\n• **Immobilier** — 5.5% / an\n• **Professionnel** — 9.0% / an\n• **Étudiant** — 4.5% / an\n\nRendez-vous dans la section **Crédits** pour simuler et soumettre votre demande.";
  }
  if (msg.includes('facture') || msg.includes('steg') || msg.includes('sonede') || msg.includes('payer')) {
    return "Vous pouvez payer vos factures directement depuis l'application :\n\n• STEG (électricité)\n• SONEDE (eau)\n• Topnet, Hexabyte (internet)\n• Ooredoo, Tunisie Telecom, Orange\n• Netflix, Spotify et autres abonnements\n\nAllez dans **Factures & Services** pour payer en quelques secondes.";
  }
  if (msg.includes('carte') || msg.includes('bloquer') || msg.includes('block')) {
    return "Pour gérer votre carte :\n\n1. Allez dans **Mes cartes**\n2. Sélectionnez la carte\n3. Cliquez sur **Bloquer la carte**\n\nVous pouvez aussi modifier les plafonds et activer/désactiver les paiements en ligne et sans contact.";
  }
  if (msg.includes('kyc') || msg.includes('vérification') || msg.includes('identité') || msg.includes('cin')) {
    return "Pour compléter votre KYC :\n\n1. Allez dans **Vérification KYC**\n2. Téléchargez votre CIN (recto/verso) ou passeport\n3. Prenez un selfie de vérification\n4. Notre IA analyse vos documents en 24-48h\n\nUn KYC validé débloque toutes les fonctionnalités.";
  }
  if (msg.includes('rib') || msg.includes('iban') || msg.includes('compte')) {
    return "Votre RIB et IBAN sont disponibles dans :\n\n• **Tableau de bord** — affiché sous votre solde\n• **Virements** — section informations bancaires\n\nFormat IBAN tunisien : **TN59** suivi de 20 chiffres.";
  }
  if (msg.includes('recharge') || msg.includes('mobile') || msg.includes('ooredoo') || msg.includes('telecom')) {
    return "Rechargez votre mobile en quelques secondes.\n\nOpérateurs disponibles :\n• Ooredoo\n• Tunisie Telecom\n• Orange Tunisie\n\nAllez dans **Factures & Services** puis l'onglet **Recharge mobile**.";
  }
  if (msg.includes('épargne') || msg.includes('objectif') || msg.includes('économiser')) {
    return "Sayzen Bank vous aide à épargner intelligemment :\n\n• Compte épargne à **3.5% / an**\n• Objectifs d'épargne personnalisés\n• Épargne automatique mensuelle\n\nAllez dans **Épargne** pour créer votre premier objectif.";
  }
  if (msg.includes('sécurité') || msg.includes('mot de passe') || msg.includes('2fa')) {
    return "Vos options de sécurité :\n\n• Changement de mot de passe dans **Mon profil**\n• Authentification 2FA (bientôt disponible)\n• Verrouillage automatique après 5 tentatives\n\nVotre sécurité est notre priorité.";
  }
  if (msg.includes('bonjour') || msg.includes('salut') || msg.includes('hello') || msg.includes('hi')) {
    return `Bonjour ! Je suis **SayzenBot**, votre assistant financier Sayzen Bank.\n\nJe peux vous aider avec :\n• Consulter votre solde\n• Effectuer des virements\n• Payer vos factures\n• Demander un crédit\n\nComment puis-je vous aider ?`;
  }
  if (msg.includes('merci') || msg.includes('thanks')) {
    return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Je suis disponible 24h/24.";
  }
  if (msg.includes('aide') || msg.includes('help') || msg.includes('?')) {
    return "Je peux vous aider avec :\n\n**Comptes** — solde, RIB, IBAN\n**Virements** — interne, interbancaire, SWIFT\n**Cartes** — gestion, blocage, plafonds\n**Transactions** — historique, catégories\n**Factures** — STEG, SONEDE, recharge\n**Crédits** — simulation, demande\n**Épargne** — objectifs, taux\n**KYC** — vérification identité\n\nPosez-moi votre question.";
  }

  return "Je n'ai pas bien compris votre question. Essayez :\n\n• \"Quel est mon solde ?\"\n• \"Comment faire un virement ?\"\n• \"Payer une facture\"\n• \"Demander un crédit\"\n\nOu tapez **aide** pour voir tout ce que je peux faire.";
};

export default function Chatbot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, from: 'bot', text: `Bonjour ${user?.first_name || ''} ! Je suis **SayzenBot**, votre assistant Sayzen Bank. Comment puis-je vous aider ?`, time: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(1);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [open, messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), from: 'user', text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    const response = await getResponse(text, api);
    setTyping(false);
    const botMsg = { id: Date.now() + 1, from: 'bot', text: response, time: new Date() };
    setMessages(prev => [...prev, botMsg]);
    if (!open) setUnread(u => u + 1);
  };

  const formatText = (text) => {
    return text.split('\n').map((line, i) => {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: formatted + (i < text.split('\n').length - 1 ? '<br/>' : '') }} />;
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button style={s.fab} onClick={() => setOpen(!open)} className="animate-glow">
        {open ? <X size={20} color="#fff" /> : <MessageSquare size={20} color="#fff" />}
        {!open && unread > 0 && <span style={s.fabBadge}>{unread}</span>}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={s.window} className="animate-fadeInUp">
          {/* Header */}
          <div style={s.header}>
            <div style={s.headerLeft}>
              <div style={s.botAvatar}>
                <Bot size={20} color="#fff" strokeWidth={2} />
                <span style={s.onlineDot} />
              </div>
              <div>
                <p style={s.botName}>SayzenBot</p>
                <p style={s.botStatus}>En ligne — Assistant IA Sayzen</p>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>
              <X size={14} color="#fff" />
            </button>
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {messages.map((msg, idx) => (
              <div key={msg.id} style={{ ...s.msgWrap, justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', animationDelay: `${idx * 0.05}s` }} className="animate-fadeInUp">
                {msg.from === 'bot' && (
                  <div style={s.msgAvatar}>
                    <Bot size={14} color="#fff" strokeWidth={2} />
                  </div>
                )}
                <div style={msg.from === 'user' ? s.userBubble : s.botBubble}>
                  <div style={s.msgText}>{formatText(msg.text)}</div>
                  <div style={s.msgTime}>{msg.time.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ ...s.msgWrap, justifyContent: 'flex-start' }}>
                <div style={s.msgAvatar}><Bot size={14} color="#fff" strokeWidth={2} /></div>
                <div style={s.botBubble}>
                  <div style={s.typingDots}>
                    <span style={{ ...s.dot, animationDelay: '0s' }} />
                    <span style={{ ...s.dot, animationDelay: '0.2s' }} />
                    <span style={{ ...s.dot, animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Replies */}
          <div style={s.quickReplies}>
            {QUICK_REPLIES.map(q => (
              <button key={q} style={s.quickBtn} onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={s.inputRow}>
            <input
              style={s.input}
              placeholder="Posez votre question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            />
            <button style={s.sendBtn} onClick={() => sendMessage(input)} disabled={!input.trim()}>
              <Send size={16} color="#fff" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  fab: { position:'fixed', bottom:'28px', right:'28px', width:'60px', height:'60px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', fontSize:'24px', cursor:'pointer', zIndex:9999, boxShadow:'0 8px 32px rgba(99,102,241,0.4)', transition:'transform 0.2s' },
  fabBadge: { position:'absolute', top:'-4px', right:'-4px', background:'#ef4444', color:'#fff', borderRadius:'50%', width:'20px', height:'20px', fontSize:'11px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center' },
  window: { position:'fixed', bottom:'100px', right:'28px', width:'380px', height:'560px', background:'#fff', borderRadius:'24px', boxShadow:'0 24px 80px rgba(99,102,241,0.2)', zIndex:9998, display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid rgba(99,102,241,0.15)' },
  header: { background:'linear-gradient(135deg,#6366f1,#8b5cf6)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  headerLeft: { display:'flex', alignItems:'center', gap:'12px' },
  botAvatar: { width:'42px', height:'42px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' },
  onlineDot: { position:'absolute', bottom:'2px', right:'2px', width:'10px', height:'10px', borderRadius:'50%', background:'#10b981', border:'2px solid #6366f1' },
  botName: { fontSize:'15px', fontWeight:'700', color:'#fff' },
  botStatus: { fontSize:'11px', color:'rgba(255,255,255,0.8)' },
  closeBtn: { background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:'28px', height:'28px', borderRadius:'50%', fontSize:'12px', cursor:'pointer' },
  messages: { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px', background:'#f8faff' },
  msgWrap: { display:'flex', alignItems:'flex-end', gap:'8px' },
  msgAvatar: { width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  botBubble: { background:'#fff', border:'1px solid #e8edf8', borderRadius:'18px 18px 18px 4px', padding:'12px 14px', maxWidth:'260px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  userBubble: { background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:'18px 18px 4px 18px', padding:'12px 14px', maxWidth:'260px' },
  msgText: { fontSize:'13px', lineHeight:'1.5', color:'inherit', wordBreak:'break-word' },
  msgTime: { fontSize:'10px', color:'rgba(0,0,0,0.3)', marginTop:'4px', textAlign:'right' },
  typingDots: { display:'flex', gap:'4px', padding:'4px 0' },
  dot: { width:'8px', height:'8px', borderRadius:'50%', background:'#6366f1', animation:'chatBounce 1.4s infinite ease-in-out', display:'inline-block' },
  quickReplies: { padding:'8px 12px', display:'flex', gap:'6px', overflowX:'auto', borderTop:'1px solid #f0f4ff', background:'#fff' },
  quickBtn: { padding:'6px 12px', background:'#f0f4ff', border:'1px solid #e0e7ff', borderRadius:'20px', fontSize:'11px', color:'#6366f1', fontWeight:'600', whiteSpace:'nowrap', cursor:'pointer', flexShrink:0, transition:'all 0.2s' },
  inputRow: { padding:'12px 16px', display:'flex', gap:'8px', background:'#fff', borderTop:'1px solid #f0f4ff' },
  input: { flex:1, padding:'10px 14px', background:'#f8faff', border:'1px solid #e0e7ff', borderRadius:'12px', fontSize:'13px', outline:'none', color:'#1e293b' },
  sendBtn: { width:'40px', height:'40px', borderRadius:'12px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontSize:'16px', cursor:'pointer' },
};
