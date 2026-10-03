import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Feedback';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const loc = useLocation();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner label="Memverifikasi sesi…" /></div>;
  if (!user || user.role !== 'super_admin') return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  return <Outlet />;
};
