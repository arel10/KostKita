import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Property, DashboardReport } from '../../types';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

interface HeaderProps {
  properties?: Property[];
  selectedPropertyId?: string;
  onSelectProperty?: (id: string) => void;
  dashboardReport?: DashboardReport | null;
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  properties = [],
  selectedPropertyId,
  onSelectProperty,
  dashboardReport,
  unreadCount = 0,
  onUnreadCountChange,
  onToggleMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sub = dashboardReport?.subscription;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-md z-30 flex items-center justify-between px-3 sm:px-6 border-b border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all">
      {/* Left items: Mobile Hamburger + Search or Property Selector */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          aria-label="Buka Menu Navigasi"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        {properties.length > 0 && onSelectProperty && (
          <div className="relative shrink-0 max-w-[140px] xs:max-w-[180px] sm:max-w-xs">
            <select
              value={selectedPropertyId || ''}
              onChange={(e) => onSelectProperty(e.target.value)}
              className="w-full truncate appearance-none bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs py-2 pl-2.5 sm:pl-3 pr-7 sm:pr-8 rounded-xl border border-slate-200/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              <option value="">Semua Properti Kost ({properties.length})</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city || 'Kota'})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>
        )}

        <div className="hidden md:flex items-center bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl gap-2 w-48 lg:w-64 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Cari kamar, penyewa..."
            className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/rooms?search=${(e.target as HTMLInputElement).value}`);
              }
            }}
          />
        </div>
      </div>

      {/* Right items: Subscription badge, Notification, Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Subscription status badge (hide on very small mobile to prevent header wrapping) */}
        {sub ? (
          <Link
            to="/subscription"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="truncate max-w-[160px]">
              Paket {sub.planName} • {sub.daysLeft} Hari Lagi
            </span>
          </Link>
        ) : (
          <Link
            to="/subscription"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Langganan Aktif</span>
          </Link>
        )}

        {/* Notification Popover Dropdown */}
        <NotificationDropdown
          initialUnreadCount={unreadCount}
          onUnreadCountChange={onUnreadCountChange}
        />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            aria-expanded={dropdownOpen}
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.name?.charAt(0).toUpperCase() || 'O'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user?.name || 'Owner'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Pemilik Kost</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">
              expand_more
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-800 truncate">{user?.name}</p>
                <p className="text-slate-400 text-[11px] truncate">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">person</span>
                Profil & Keamanan
              </Link>
              <Link
                to="/subscription"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">loyalty</span>
                Paket Langganan
              </Link>
              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium border-t border-slate-100"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">travel_explore</span>
                Lihat Portal Pencari Kost
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 font-semibold border-t border-slate-100 mt-1"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Keluar (Logout)
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
