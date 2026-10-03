import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Feedback';

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
  { to: '/admin/owners', label: 'Owners', icon: 'groups' },
  { to: '/admin/properties', label: 'Properties', icon: 'apartment' },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: 'card_membership' },
  { to: '/admin/payments', label: 'Payments', icon: 'payments', badge: 'pendingPayments' },
  { to: '/admin/plans', label: 'Plans', icon: 'sell' },
  { to: '/admin/reports', label: 'Reports', icon: 'monitoring' },
  { to: '/admin/listing-reports', label: 'Listing Reports', icon: 'flag', badge: 'pendingReports' },
  { to: '/admin/notifications', label: 'Notifications', icon: 'campaign' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'history' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const { data: counts } = useQuery({
    queryKey: ['badge-counts'],
    queryFn: async () => (await api.get('/admin/dashboard')).data.data as { pendingPayments: number; pendingReports: number },
    refetchInterval: 60_000,
  });

  const current = nav.find((n) => loc.pathname.startsWith(n.to))?.label ?? 'Admin';

  const sidebar = (
    <aside className="w-64 h-full bg-ink-900 text-ink-200 flex flex-col">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5 bg-ink-950/40">
        <img
          src="/logo.png"
          alt="KostKita Logo"
          className="h-10 w-auto object-contain bg-white rounded-xl p-1 shadow-sm shrink-0"
        />
        <div>
          <p className="text-white font-extrabold leading-tight text-base tracking-tight">
            Kost<span className="text-amber-400">Kita</span>
          </p>
          <p className="text-[10px] font-bold tracking-widest text-brand-300 uppercase">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map((n) => {
          const badge = n.badge ? (counts as any)?.[n.badge] : 0;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? 'bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {badge > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user?.name} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-ink-400 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} title="Keluar" aria-label="Keluar" className="p-2 rounded-lg text-ink-400 hover:text-rose-400 hover:bg-white/5 transition">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">{sidebar}</div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="animate-slide-in">{sidebar}</div>
          <div className="flex-1 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-ink-200/70 px-4 lg:px-8 h-16 flex items-center gap-3">
          <button className="lg:hidden btn-ghost !px-2" onClick={() => setOpen(true)} aria-label="Buka menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-400 font-medium">Admin</span>
            <span className="material-symbols-outlined text-ink-300 text-[16px]">chevron_right</span>
            <span className="font-bold text-ink-800">{current}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {(counts?.pendingPayments ?? 0) > 0 && (
              <NavLink to="/admin/payments" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold ring-1 ring-amber-600/20 hover:bg-amber-100 transition">
                <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                {counts!.pendingPayments} pembayaran menunggu
              </NavLink>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
