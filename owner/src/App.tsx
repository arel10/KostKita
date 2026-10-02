import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { GoogleCallbackPage } from './pages/auth/GoogleCallbackPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PropertyListPage } from './pages/properties/PropertyListPage';
import { PropertyFormPage } from './pages/properties/PropertyFormPage';
import { PropertyDetailPage } from './pages/properties/PropertyDetailPage';
import { RoomListPage } from './pages/rooms/RoomListPage';
import { TenantListPage } from './pages/tenants/TenantListPage';
import { PaymentListPage } from './pages/payments/PaymentListPage';
import { ReportPage } from './pages/reports/ReportPage';
import { SubscriptionPage } from './pages/subscriptions/SubscriptionPage';
import { NotificationPage } from './pages/notifications/NotificationPage';
import { SettingsPage } from './pages/settings/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

          {/* Protected Owner Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/properties" element={<PropertyListPage />} />
              <Route path="/properties/new" element={<PropertyFormPage />} />
              <Route path="/properties/:id/edit" element={<PropertyFormPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route path="/rooms" element={<RoomListPage />} />
              <Route path="/tenants" element={<TenantListPage />} />
              <Route path="/payments" element={<PaymentListPage />} />
              <Route path="/reports" element={<ReportPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/notifications" element={<NotificationPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
