import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  unreadNotificationCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
}

interface NavCategory {
  category: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  unreadNotificationCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();

  const navCategories: NavCategory[] = [
    {
      category: 'Menu Utama',
      items: [
        { label: 'Dashboard', path: '/', icon: 'dashboard' },
      ],
    },
    {
      category: 'Manajemen Kost',
      items: [
        { label: 'Properti', path: '/properties', icon: 'apartment' },
        { label: 'Kamar', path: '/rooms', icon: 'meeting_room' },
        { label: 'Penyewa', path: '/tenants', icon: 'group' },
      ],
    },
    {
      category: 'Keuangan & Analitik',
      items: [
        { label: 'Pembayaran', path: '/payments', icon: 'payments' },
        { label: 'Laporan', path: '/reports', icon: 'insights' },
      ],
    },
    {
      category: 'Akun & Sistem',
      items: [
        { label: 'Langganan', path: '/subscription', icon: 'loyalty' },
        { label: 'Pengaturan', path: '/settings', icon: 'settings' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Fixed drawer on mobile, static column on desktop */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-2xl lg:shadow-[0_1px_8px_rgba(15,23,42,0.06)] border-r border-slate-100 select-none transition-transform duration-300 ease-in-out ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header with Close Button for mobile */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <img
                alt="KostKita Brand Logo"
                className="h-10 w-auto object-contain"
                src="/logo.png"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-base text-slate-900 leading-tight tracking-tight">
                  Kost<span className="text-amber-500">Kita</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Juragan Portal
                </span>
              </div>
            </Link>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Tutup Menu"
              aria-label="Tutup Menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Categorized Navigation Menu */}
          <nav className="flex flex-col gap-4 px-3 py-3">
            {navCategories.map((group) => (
              <div key={group.category} className="flex flex-col gap-1">
                <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.category}
                </div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => onCloseMobile?.()}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl font-medium text-sm transition-all duration-200 group ${isActive
                        ? 'bg-primary text-white shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:bg-slate-100/80 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <span
                            className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-primary'
                              }`}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold shadow-xs ${isActive
                              ? 'bg-white text-primary'
                              : 'bg-red-500 text-white'
                              }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Support & Profile snippet */}
        <div className="p-3 border-t border-slate-100 flex flex-col gap-2 shrink-0 bg-white">
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%20KostKita,%20saya%20butuh%20bantuan"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 p-2.5 rounded-xl flex items-center justify-between transition-colors border border-emerald-200/60 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                support_agent
              </span>
              <span className="text-xs font-semibold">Bantuan CS</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
              Online
            </span>
          </a>

          {user && (
            <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 truncate">{user.name}</span>
                <span className="text-[11px] text-slate-500 truncate">{user.email}</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
