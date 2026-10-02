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
      {/* Sidebar fixed left */}
      <Sidebar unreadNotificationCount={unreadCount} />

      {/* Main container offset by sidebar width (w-64 = 16rem = 256px) */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        <Header
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelectProperty={setSelectedPropertyId}
          dashboardReport={dashboardReport}
          unreadCount={unreadCount}
        />

        {/* Main Content Area */}
        <main className="pt-16 p-6 lg:p-8 flex-1">
          <Outlet context={{ properties, selectedPropertyId, refreshGlobal: fetchGlobalData }} />
        </main>
      </div>
    </div>
  );
};
