import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { OwnerListPage } from './pages/owners/OwnerListPage';
import { OwnerDetailPage } from './pages/owners/OwnerDetailPage';
import { PropertyListPage } from './pages/properties/PropertyListPage';
import { PropertyDetailPage } from './pages/properties/PropertyDetailPage';
import { SubscriptionListPage } from './pages/subscriptions/SubscriptionListPage';
import { PaymentListPage } from './pages/payments/PaymentListPage';
import { PaymentDetailPage } from './pages/payments/PaymentDetailPage';
import { PlanListPage } from './pages/plans/PlanListPage';
import { PlanFormPage } from './pages/plans/PlanFormPage';
import { ReportPage } from './pages/reports/ReportPage';
import { ListingReportPage } from './pages/reports/ListingReportPage';
import { NotificationPage } from './pages/notifications/NotificationPage';
import { AuditLogPage } from './pages/audit/AuditLogPage';
import { SettingsPage } from './pages/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 15_000 } },
});

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/owners" element={<OwnerListPage />} />
                <Route path="/admin/owners/:id" element={<OwnerDetailPage />} />
                <Route path="/admin/properties" element={<PropertyListPage />} />
                <Route path="/admin/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/admin/subscriptions" element={<SubscriptionListPage />} />
                <Route path="/admin/payments" element={<PaymentListPage />} />
                <Route path="/admin/payments/:id" element={<PaymentDetailPage />} />
                <Route path="/admin/plans" element={<PlanListPage />} />
                <Route path="/admin/plans/new" element={<PlanFormPage />} />
                <Route path="/admin/plans/:id/edit" element={<PlanFormPage />} />
                <Route path="/admin/reports" element={<ReportPage />} />
                <Route path="/admin/listing-reports" element={<ListingReportPage />} />
                <Route path="/admin/notifications" element={<NotificationPage />} />
                <Route path="/admin/audit-logs" element={<AuditLogPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
