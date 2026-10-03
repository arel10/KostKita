import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Feedback';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  badgeKey?: 'pendingPayments' | 'pendingReports';
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    category: 'Menu Utama',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard Overview', icon: 'space_dashboard' },
      { to: '/admin/banners', label: 'Banner Promosi', icon: 'view_carousel' },
    ],
  },
  {
    category: 'Keuangan & Langganan',
    items: [
      { to: '/admin/payments', label: 'Verifikasi Pembayaran', icon: 'payments', badgeKey: 'pendingPayments' },
      { to: '/admin/subscriptions', label: 'Paket Berlangganan', icon: 'card_membership' },
      { to: '/admin/plans', label: 'Manajemen Plan', icon: 'sell' },
    ],
  },
  {
    category: 'Pengguna & Properti',
    items: [
      { to: '/admin/owners', label: 'Pemilik Kost (Owners)', icon: 'groups' },
      { to: '/admin/properties', label: 'Properti & Unit Kost', icon: 'apartment' },
    ],
  },
  {
    category: 'Moderasi & Laporan',
    items: [
      { to: '/admin/reports', label: 'Laporan Platform', icon: 'monitoring' },
      { to: '/admin/listing-reports', label: 'Laporan Pelanggaran', icon: 'flag', badgeKey: 'pendingReports' },
      { to: '/admin/notifications', label: 'Siaran Notifikasi', icon: 'campaign' },
    ],
  },
  {
    category: 'Sistem & Keamanan',
    items: [
      { to: '/admin/system-health', label: 'Kesehatan Sistem', icon: 'monitor_heart' },
      { to: '/admin/audit-logs', label: 'Log Audit Aktivitas', icon: 'history' },
      { to: '/admin/settings', label: 'Pengaturan Sistem', icon: 'settings' },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const { data: counts } = useQuery({
    queryKey: ['badge-counts'],
    queryFn: async () => (await api.get('/admin/dashboard')).data.data as { pendingPayments: number; pendingReports: number },
    refetchInterval: 30_000,
  });

  const allItems = navGroups.flatMap((g) => g.items);
  const current = allItems.find((n) => loc.pathname === n.to || (n.to !== '/admin/dashboard' && loc.pathname.startsWith(n.to)))?.label ?? 'Super Admin';

  const sidebar = (
    <aside className="w-64 h-full bg-white text-slate-700 flex flex-col border-r border-slate-200/80 shadow-2xs">
      {/* Brand Header */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100 bg-slate-50/80">
        <img
          src="/logo.png"
          alt="KostKita Logo"
          className="h-10 w-auto object-contain bg-white rounded-xl p-1 border border-slate-200 shadow-2xs shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-900 font-black leading-tight text-base tracking-tight">
              Kost<span className="text-amber-500">Kita</span>
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              PRO
            </span>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
            Super Administrator
          </p>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              {group.category}
            </div>

            {group.items.map((n) => {
              const badge = n.badgeKey ? (counts as any)?.[n.badgeKey] : 0;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold select-none ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200/80 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[19px] shrink-0 text-slate-400 group-hover:text-slate-700">
                    {n.icon}
                  </span>
                  <span className="flex-1 truncate">{n.label}</span>
                  {badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      {badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Admin Profile Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <Avatar name={user?.name} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Keluar (Logout)"
            aria-label="Keluar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">{sidebar}</div>

      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div>{sidebar}</div>
          <div className="flex-1 bg-slate-950/50 backdrop-blur-xs" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 h-16 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-400 font-medium">KostKita</span>
              <span className="material-symbols-outlined text-slate-300 text-[14px]">chevron_right</span>
              <span className="text-slate-400 font-medium">Super Admin</span>
              <span className="material-symbols-outlined text-slate-300 text-[14px]">chevron_right</span>
              <span className="font-extrabold text-slate-900">{current}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Pending Alerts in Header */}
            {(counts?.pendingPayments ?? 0) > 0 && (
              <NavLink
                to="/admin/payments"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 hover:bg-amber-100 transition shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-600">pending_actions</span>
                <span>{counts!.pendingPayments} Pembayaran Pending</span>
              </NavLink>
            )}

            {(counts?.pendingReports ?? 0) > 0 && (
              <NavLink
                to="/admin/listing-reports"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 hover:bg-rose-100 transition shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px] text-rose-600">flag</span>
                <span>{counts!.pendingReports} Laporan Listing</span>
              </NavLink>
            )}

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="text-right hidden md:block">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
