import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import api from '../../lib/api';
import { Property, DashboardReport } from '../../types';

export const DashboardLayout: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [dashboardReport, setDashboardReport] = useState<DashboardReport | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const fetchGlobalData = async () => {
    try {
      const [propsRes, reportRes, notifRes] = await Promise.allSettled([
        api.get('/properties'),
        api.get('/reports/dashboard'),
        api.get('/notifications'),
      ]);

      if (propsRes.status === 'fulfilled' && propsRes.value.data?.data) {
        setProperties(propsRes.value.data.data);
      }
      if (reportRes.status === 'fulfilled' && reportRes.value.data?.data) {
        setDashboardReport(reportRes.value.data.data);
      }
      if (notifRes.status === 'fulfilled' && notifRes.value.data?.data) {
        const notifs = notifRes.value.data.data;
        const unread = notifs.filter((n: any) => !n.readAt).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error('Failed to fetch layout summary:', e);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface flex">
      {/* Sidebar (Responsive drawer on mobile, fixed column on desktop) */}
      <Sidebar
        unreadNotificationCount={unreadCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main container: only pl-64 on desktop (lg:), pl-0 on mobile */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelectProperty={setSelectedPropertyId}
          dashboardReport={dashboardReport}
          unreadCount={unreadCount}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Main Content Area: Safe top padding (pt-20 sm:pt-22 lg:pt-24) to ensure content is NEVER clipped by header */}
        <main className="pt-20 sm:pt-22 lg:pt-24 px-4 sm:px-6 lg:px-8 pb-16 flex-1 min-w-0">
          <Outlet context={{ properties, selectedPropertyId, refreshGlobal: fetchGlobalData }} />
        </main>
      </div>
    </div>
  );
};
