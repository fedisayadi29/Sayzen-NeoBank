import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Chatbot from './Chatbot';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, FileText,
  TrendingUp, PiggyBank, BarChart2, Shield, ShieldCheck, User,
  Users, AlertTriangle, ClipboardList, LogOut, Bell,
  ChevronLeft, ChevronRight, Send
} from 'lucide-react';

const userNav = [
  { path:'/dashboard',    label:'Tableau de bord',   Icon:LayoutDashboard,  color:'#6366f1' },
  { path:'/transactions', label:'Transactions',       Icon:ArrowLeftRight,   color:'#8b5cf6' },
  { path:'/transfer',     label:'Virements',          Icon:Send,             color:'#06b6d4' },
  { path:'/cards',        label:'Mes cartes',         Icon:CreditCard,       color:'#f59e0b' },
  { path:'/bills',        label:'Factures',           Icon:FileText,         color:'#10b981' },
  { path:'/loans',        label:'Crédits',            Icon:TrendingUp,       color:'#ef4444' },
  { path:'/savings',      label:'Épargne',            Icon:PiggyBank,        color:'#8b5cf6' },
  { path:'/analytics',    label:'Analytique',         Icon:BarChart2,        color:'#06b6d4' },
  { path:'/kyc',          label:'Vérification KYC',   Icon:ShieldCheck,      color:'#f59e0b' },
  { path:'/profile',      label:'Mon profil',         Icon:User,             color:'#6366f1' },
];

const adminNav = [
  { path:'/admin',              label:'Dashboard',       Icon:LayoutDashboard, color:'#6366f1' },
  { path:'/admin/users',        label:'Clients',         Icon:Users,           color:'#8b5cf6' },
  { path:'/admin/transactions', label:'Transactions',    Icon:ArrowLeftRight,  color:'#06b6d4' },
  { path:'/admin/loans',        label:'Crédits',         Icon:TrendingUp,      color:'#ef4444' },
  { path:'/admin/change-requests', label:'Modifications', Icon:ClipboardList,   color:'#f59e0b' },
  { path:'/admin/fraud',        label:'Alertes fraude',  Icon:AlertTriangle,   color:'#ef4444' },
  { path:'/admin/audit',        label:'Audit & Logs',    Icon:ClipboardList,   color:'#64748b' },
];

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  const isAdmin = ['admin','compliance'].includes(user?.role);
  const nav = isAdmin ? adminNav : userNav;

  useEffect(() => {
    if (!isAdmin) {
      api.get('/user/notifications').then(r => {
        setNotifs(r.data.slice(0,5));
        setUnread(r.data.filter(n => !n.is_read).length);
      }).catch(() => {});
    }
  }, [isAdmin]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const kycColor = { verified:'#10b981', pending:'#f59e0b', in_review:'#3b82f6', rejected:'#ef4444' };
  const kycLabel = { verified:'✓ Vérifié', pending:'⏳ En attente', in_review:'🔍 En révision', rejected:'✗ Rejeté' };

  return (
    <div style={s.root}>
      {/* Sidebar */}
      <aside style={{ ...s.sidebar, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandLogo}>
            <Shield size={22} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div style={s.brandName}>Sayzen</div>
            <div style={s.brandSub}>BANK · تونس</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {nav.map((item, idx) => {
            const active = location.pathname === item.path;
            const { Icon } = item;
            return (
              <Link key={item.path} to={item.path}
                style={{ ...s.navItem, animationDelay: `${idx * 0.04}s`, ...(active ? { ...s.navActive, '--nav-color': item.color } : {}) }}
                className="animate-fadeInLeft"
                onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <div style={{ ...s.navIconWrap, background: active ? item.color + '18' : 'transparent', color: active ? item.color : '#64748b' }}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span style={{ color: active ? item.color : '#374151', fontWeight: active ? '700' : '500', fontSize:'13px' }}>{item.label}</span>
                {active && <div style={{ ...s.activeBar, background: item.color }} />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={s.sidebarFooter}>
          <div style={s.userCard}>
            <div style={s.userAvatar}>{isAdmin ? 'A' : (user?.first_name?.[0] || '')}{isAdmin ? '' : (user?.last_name?.[0] || '')}</div>
            <div style={s.userInfo}>
              <div style={s.userName}>{isAdmin ? 'Admin' : `${user?.first_name} ${user?.last_name}`}</div>
              <div style={{ ...s.kycPill, background:(kycColor[user?.kyc_status]||'#64748b')+'18', color:kycColor[user?.kyc_status]||'#64748b' }}>
                {kycLabel[user?.kyc_status] || user?.kyc_status}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>
            <LogOut size={14} style={{ marginRight:'6px' }} />
            Déconnexion
          </button>
        </div>
      </aside>

      {sidebarOpen && window.innerWidth < 768 && <div style={s.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div style={{ ...s.main, marginLeft: sidebarOpen ? '260px' : '0' }}>
        {/* Header */}
        <header style={s.header} className="glass">
          <div style={s.headerLeft}>
            <button style={s.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            {title && <h1 style={s.pageTitle}>{title}</h1>}
          </div>
          <div style={s.headerRight}>
            {!isAdmin && (
              <div style={{ position:'relative' }}>
                <button style={s.notifBtn} onClick={() => setNotifOpen(!notifOpen)}>
                  <Bell size={18} />
                  {unread > 0 && <span style={s.badge}>{unread}</span>}
                </button>
                {notifOpen && (
                  <div style={s.notifDropdown} className="animate-slideDown">
                    <div style={s.notifHeader}>
                      <span>Notifications</span>
                      {unread > 0 && <span style={s.notifCount}>{unread} nouvelles</span>}
                    </div>
                    {notifs.length === 0
                      ? <p style={s.notifEmpty}>Aucune notification</p>
                      : notifs.map(n => (
                        <div key={n.id} style={{ ...s.notifItem, opacity: n.is_read ? 0.6 : 1 }}>
                          <div style={s.notifDot(n.type)} />
                          <div>
                            <div style={s.notifTitle}>{n.title}</div>
                            <div style={s.notifMsg}>{n.message}</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
            <div style={s.headerUser}>
              <div style={s.headerAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
              <div>
                <div style={s.headerName}>{isAdmin ? 'Admin' : user?.first_name}</div>
                <div style={s.headerRole}>{isAdmin ? 'Administrateur' : 'Client'}</div>
              </div>
            </div>
          </div>
        </header>

        <main style={s.content}>{children}</main>
      </div>

      {/* Chatbot — only for users */}
      {!isAdmin && <Chatbot />}
    </div>
  );
}

const s = {
  root: { display:'flex', minHeight:'100vh', background:'#f0f4ff' },
  sidebar: { width:'260px', background:'#fff', borderRight:'1px solid #e8edf8', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, height:'100vh', zIndex:1000, transition:'transform 0.3s ease', boxShadow:'4px 0 24px rgba(99,102,241,0.06)' },
  brand: { padding:'22px 20px', display:'flex', alignItems:'center', gap:'12px', borderBottom:'1px solid #f0f4ff' },
  brandLogo: { width:'44px', height:'44px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', boxShadow:'0 4px 16px rgba(99,102,241,0.3)' },
  brandName: { fontSize:'20px', fontWeight:'800', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  brandSub: { fontSize:'10px', color:'#4b5563', letterSpacing:'2px', textTransform:'uppercase' },
  nav: { flex:1, padding:'14px 10px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'2px' },
  navItem: { display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'12px', fontSize:'13px', transition:'all 0.2s', position:'relative', cursor:'pointer' },
  navActive: { background:'#f5f3ff' },
  navIconWrap: { width:'32px', height:'32px', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', transition:'all 0.2s', flexShrink:0 },
  activeBar: { position:'absolute', right:'0', top:'20%', width:'3px', height:'60%', borderRadius:'2px' },
  sidebarFooter: { padding:'14px', borderTop:'1px solid #f0f4ff' },
  userCard: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', padding:'10px', background:'#f8faff', borderRadius:'12px' },
  userAvatar: { width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#fff', flexShrink:0 },
  userInfo: { flex:1, minWidth:0 },
  userName: { fontSize:'12px', fontWeight:'700', color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  kycPill: { fontSize:'10px', fontWeight:'600', padding:'2px 7px', borderRadius:'20px', marginTop:'3px', display:'inline-block' },
  logoutBtn: { width:'100%', padding:'9px', background:'#fff5f5', border:'1px solid #fecaca', borderRadius:'10px', color:'#ef4444', fontSize:'12px', fontWeight:'600', cursor:'pointer', transition:'all 0.2s' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:999 },
  main: { flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', transition:'margin-left 0.3s ease' },
  header: { padding:'14px 28px', borderBottom:'1px solid #e8edf8', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 },
  headerLeft: { display:'flex', alignItems:'center', gap:'14px' },
  menuBtn: { background:'#f0f4ff', border:'none', color:'#6366f1', fontSize:'14px', padding:'8px 10px', borderRadius:'10px', cursor:'pointer', fontWeight:'700' },
  pageTitle: { fontSize:'18px', fontWeight:'800', color:'#0f172a' },
  headerRight: { display:'flex', alignItems:'center', gap:'14px' },
  notifBtn: { background:'#f0f4ff', border:'1px solid #e0e7ff', borderRadius:'12px', padding:'8px 12px', color:'#6366f1', fontSize:'16px', position:'relative', cursor:'pointer' },
  badge: { position:'absolute', top:'-5px', right:'-5px', background:'#ef4444', color:'#fff', borderRadius:'50%', width:'18px', height:'18px', fontSize:'10px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center' },
  notifDropdown: { position:'absolute', right:0, top:'calc(100% + 8px)', width:'320px', background:'#fff', border:'1px solid #e8edf8', borderRadius:'16px', overflow:'hidden', boxShadow:'0 20px 60px rgba(99,102,241,0.15)', zIndex:200 },
  notifHeader: { padding:'14px 16px', fontSize:'13px', fontWeight:'700', color:'#0f172a', borderBottom:'1px solid #f0f4ff', display:'flex', justifyContent:'space-between', alignItems:'center' },
  notifCount: { fontSize:'11px', background:'#f0f4ff', color:'#6366f1', padding:'2px 8px', borderRadius:'20px', fontWeight:'600' },
  notifEmpty: { padding:'20px', color:'#475569', fontSize:'13px', textAlign:'center' },
  notifItem: { padding:'12px 16px', borderBottom:'1px solid #f8faff', display:'flex', gap:'10px', alignItems:'flex-start' },
  notifDot: (type) => ({ width:'8px', height:'8px', borderRadius:'50%', marginTop:'4px', flexShrink:0, background: type==='success' ? '#10b981' : type==='warning' ? '#f59e0b' : type==='error' ? '#ef4444' : '#6366f1' }),
  notifTitle: { fontSize:'12px', fontWeight:'700', color:'#0f172a', marginBottom:'2px' },
  notifMsg: { fontSize:'11px', color:'#374151' },
  headerUser: { display:'flex', alignItems:'center', gap:'10px' },
  headerAvatar: { width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#fff' },
  headerName: { fontSize:'13px', fontWeight:'700', color:'#0f172a' },
  headerRole: { fontSize:'11px', color:'#94a3b8' },
  content: { flex:1, padding:'28px', overflowY:'auto' },
};
