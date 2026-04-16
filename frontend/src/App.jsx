import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/user/Dashboard';
import Transactions from './pages/user/Transactions';
import Transfer from './pages/user/Transfer';
import Cards from './pages/user/Cards';
import Profile from './pages/user/Profile';
import Bills from './pages/user/Bills';
import Loans from './pages/user/Loans';
import Savings from './pages/user/Savings';
import Analytics from './pages/user/Analytics';
import KYC from './pages/user/KYC';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';
import UserDetail from './pages/admin/UserDetail';
import AdminLoans from './pages/admin/AdminLoans';
import AdminChangeRequests from './pages/admin/AdminChangeRequests';
import FraudAlerts from './pages/admin/FraudAlerts';
import AuditLogs from './pages/admin/AuditLogs';

const Loader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f0f4ff', flexDirection:'column', gap:'16px' }}>
    <div style={{ width:'48px', height:'48px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'24px', height:'24px', border:'3px solid rgba(255,255,255,0.4)', borderTop:'3px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
    <div style={{ color:'#6366f1', fontSize:'18px', fontWeight:'700' }}>Sayzen Bank</div>
    <div style={{ color:'#94a3b8', fontSize:'13px' }}>Chargement...</div>
  </div>
);

const PrivateRoute = ({ children, adminOnly=false }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !['admin','compliance'].includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  const isAdmin = user && ['admin','compliance'].includes(user.role);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
      <Route path="/transfer" element={<PrivateRoute><Transfer /></PrivateRoute>} />
      <Route path="/cards" element={<PrivateRoute><Cards /></PrivateRoute>} />
      <Route path="/bills" element={<PrivateRoute><Bills /></PrivateRoute>} />
      <Route path="/loans" element={<PrivateRoute><Loans /></PrivateRoute>} />
      <Route path="/savings" element={<PrivateRoute><Savings /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
      <Route path="/kyc" element={<PrivateRoute><KYC /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
      <Route path="/admin/users/:id" element={<PrivateRoute adminOnly><UserDetail /></PrivateRoute>} />
      <Route path="/admin/transactions" element={<PrivateRoute adminOnly><AdminTransactions /></PrivateRoute>} />
      <Route path="/admin/loans" element={<PrivateRoute adminOnly><AdminLoans /></PrivateRoute>} />
      <Route path="/admin/change-requests" element={<PrivateRoute adminOnly><AdminChangeRequests /></PrivateRoute>} />
      <Route path="/admin/fraud" element={<PrivateRoute adminOnly><FraudAlerts /></PrivateRoute>} />
      <Route path="/admin/audit" element={<PrivateRoute adminOnly><AuditLogs /></PrivateRoute>} />

      <Route path="*" element={<Navigate to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'} />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
