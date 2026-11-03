import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/Toast';

import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserForm from './pages/UserForm';
import Payroll from './pages/Payroll';
import MonthlyPaysheets from './pages/MonthlyPaysheets';
import PrintPayslips from './pages/PrintPayslips';
import Export from './pages/Export';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) return <div className="login-page"><div className="spinner" /></div>;
  
  // Strictly allow only super_admin
  if (!isAuthenticated || user?.role !== 'super_admin') return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserForm />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="paysheets" element={<MonthlyPaysheets />} />
            <Route path="print-payslips" element={<PrintPayslips />} />
            <Route path="export" element={<Export />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}
