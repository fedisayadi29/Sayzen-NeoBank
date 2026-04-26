import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login        from './pages/Login';
import Register     from './pages/Register';
import Dashboard    from './pages/user/Dashboard';
import Transactions from './pages/user/Transactions';
import Transfer     from './pages/user/Transfer';
import Cards        from './pages/user/Cards';
import Profile      from './pages/user/Profile';
import Bills        from './pages/user/Bills';
import Loans        from './pages/user/Loans';
import Savings      from './pages/user/Savings';
import Analytics    from './pages/user/Analytics';
import KYC          from './pages/user/KYC';

import AdminDashboard      from './pages/admin/AdminDashboard';
import AdminUsers          from './pages/admin/AdminUsers';
import AdminTransactions   from './pages/admin/AdminTransactions';
import UserDetail          from './pages/admin/UserDetail';
import AdminLoans          from './pages/admin/AdminLoans';
import AdminChangeRequests from './pages/admin/AdminChangeRequests';
import FraudAlerts         from './pages/admin/FraudAlerts';
import AuditLogs           from './pages/admin/AuditLogs';

// Route guard — redirects to /login if not authenticated
const Private = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !['admin', 'compliance'].includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return children;
};

// Public route — redirects away if already logged in
const Public = ({ children }) => {
  const { user } = useAuth();
  if (!user) return children;
  const isAdmin = ['admin', 'compliance'].includes(user.role);
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const isAdmin = user && ['admin', 'compliance'].includes(user.role);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Public><Login /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />

      {/* User */}
      <Route path="/dashboard"    element={<Private><Dashboard /></Private>} />
      <Route path="/transactions" element={<Private><Transactions /></Private>} />
      <Route path="/transfer"     element={<Private><Transfer /></Private>} />
      <Route path="/cards"        element={<Private><Cards /></Private>} />
      <Route path="/bills"        element={<Private><Bills /></Private>} />
      <Route path="/loans"        element={<Private><Loans /></Private>} />
      <Route path="/savings"      element={<Private><Savings /></Private>} />
      <Route path="/analytics"    element={<Private><Analytics /></Private>} />
      <Route path="/kyc"          element={<Private><KYC /></Private>} />
      <Route path="/profile"      element={<Private><Profile /></Private>} />

      {/* Admin */}
      <Route path="/admin"                  element={<Private adminOnly><AdminDashboard /></Private>} />
      <Route path="/admin/users"            element={<Private adminOnly><AdminUsers /></Private>} />
      <Route path="/admin/users/:id"        element={<Private adminOnly><UserDetail /></Private>} />
      <Route path="/admin/transactions"     element={<Private adminOnly><AdminTransactions /></Private>} />
      <Route path="/admin/loans"            element={<Private adminOnly><AdminLoans /></Private>} />
      <Route path="/admin/change-requests"  element={<Private adminOnly><AdminChangeRequests /></Private>} />
      <Route path="/admin/fraud"            element={<Private adminOnly><FraudAlerts /></Private>} />
      <Route path="/admin/audit"            element={<Private adminOnly><AuditLogs /></Private>} />

      {/* Fallback */}
      <Route path="*" element={
        <Navigate to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'} replace />
      } />
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
