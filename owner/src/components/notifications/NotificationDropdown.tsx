import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';
import { NotificationItem } from '../../types';

interface NotificationDropdownProps {
  initialUnreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  initialUnreadCount = 0,
  onUnreadCountChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  
  // Active detail view inside the dropdown panel
  const [activeDetailItem, setActiveDetailItem] = useState<NotificationItem | null>(null);
  
  // Full modal view (portaled to document.body)
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal unreadCount with prop if prop changes
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.data) {
        const items: NotificationItem[] = res.data.data;
        setNotifications(items);
        const count = items.filter((n) => !n.readAt).length;
        setUnreadCount(count);
        onUnreadCountChange?.(count);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
        } else if (activeDetailItem) {
          setActiveDetailItem(null);
        } else {
          setIsOpen(false);
        }
      }
    };

    if (isOpen || isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isModalOpen, activeDetailItem]);

  // Handle open dropdown
  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setActiveDetailItem(null);
      fetchNotifications();
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: now } : n))
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        onUnreadCountChange?.(next);
        return next;
      });
      if (activeDetailItem?.id === id) {
        setActiveDetailItem((prev) => (prev ? { ...prev, readAt: now } : null));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || now })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
      if (activeDetailItem && !activeDetailItem.readAt) {
        setActiveDetailItem((prev) => (prev ? { ...prev, readAt: now } : null));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsDeletingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      const targetItem = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (targetItem && !targetItem.readAt) {
        setUnreadCount((prev) => {
          const next = Math.max(0, prev - 1);
          onUnreadCountChange?.(next);
          return next;
        });
      }
      if (activeDetailItem?.id === id) {
        setActiveDetailItem(null);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Delete all notifications
  const handleDeleteAll = async () => {
    if (!window.confirm('Hapus semua riwayat notifikasi Anda?')) return;
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      setUnreadCount(0);
      onUnreadCountChange?.(0);
      setActiveDetailItem(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
    }
  };

  // Click on a notification item: Show detail view inline and mark as read automatically
  const handleItemClick = (item: NotificationItem) => {
    setActiveDetailItem(item);
    if (!item.readAt) {
      handleMarkAsRead(item.id);
    }
  };

  // Expand detail view to full modal
  const handleExpandToModal = () => {
    setIsModalOpen(true);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'subscription_expiring':
      case 'subscription_expired':
        return { icon: 'schedule', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'payment_approved':
        return { icon: 'verified', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'payment_rejected':
        return { icon: 'cancel', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'owner_suspended':
      case 'listing_suspended':
        return { icon: 'warning', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'announcement':
        return { icon: 'campaign', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      default:
        return { icon: 'notifications', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Baru saja';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} mnt lalu`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} hari lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  };

  const formatFullDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return `${formattedDate} pukul ${hours}.${minutes} WIB`;
    } catch {
      return dateString;
    }
  };

  const displayedNotifications =
    filterTab === 'unread' ? notifications.filter((n) => !n.readAt) : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-slate-100 text-[#004337] ring-2 ring-[#004337]/20'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        }`}
        title="Buka Notifikasi"
        aria-label="Notifikasi"
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 md:w-[420px] max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          
          {/* ======================================================== */}
          {/* CASE 1: DETAIL VIEW (INSIDE DROPDOWN)                    */}
          {/* ======================================================== */}
          {activeDetailItem ? (
            <div className="flex flex-col animate-in fade-in slide-in-from-right duration-200">
              {/* Detail Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setActiveDetailItem(null)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#004337] hover:bg-slate-200/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Kembali</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleExpandToModal}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Buka popup penuh"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Tutup Notifikasi"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              {/* Detail Content Body */}
              <div className="p-4 sm:p-5 space-y-4 max-h-[380px] overflow-y-auto">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${
                      getNotificationIcon(activeDetailItem.type).color
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {getNotificationIcon(activeDetailItem.type).icon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {activeDetailItem.type.replace(/_/g, ' ')}
                      </span>
                      {activeDetailItem.readAt ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">done</span>
                          <span>Sudah Dibaca</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                          Belum Dibaca
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {activeDetailItem.title}
                    </h3>
                  </div>
                </div>

                {/* Message Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {activeDetailItem.message}
                </div>

                {/* Received Time Info */}
                <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>Diterima pada: {formatFullDate(activeDetailItem.createdAt)}</span>
                </div>
              </div>

              {/* Detail Footer Actions */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteNotification(activeDetailItem.id)}
                  disabled={isDeletingId === activeDetailItem.id}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isDeletingId === activeDetailItem.id ? 'hourglass_top' : 'delete'}
                  </span>
                  <span>Hapus Notifikasi</span>
                </button>

                <div className="flex items-center gap-2">
                  {!activeDetailItem.readAt && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(activeDetailItem.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Tandai Dibaca</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveDetailItem(null)}
                    className="px-4 py-2 rounded-xl bg-[#004337] hover:bg-[#00342b] text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* CASE 2: LIST VIEW (DEFAULT)                              */
            /* ======================================================== */
            <div className="flex flex-col">
              {/* Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#004337] text-[20px]">notifications</span>
                  <h3 className="text-sm font-bold text-slate-800">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      {unreadCount} Baru
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#004337] hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Tandai semua sudah dibaca"
                    >
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      <span className="hidden sm:inline">Tandai Dibaca</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={fetchNotifications}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title="Muat ulang notifikasi"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-3 pt-2 pb-1 border-b border-slate-100 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-[#004337] text-white shadow-2xs'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('unread')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    filterTab === 'unread'
                      ? 'bg-[#004337] text-white shadow-2xs'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>Belum Dibaca</span>
                  {unreadCount > 0 && (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-extrabold ${
                        filterTab === 'unread' ? 'bg-white text-[#004337]' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Notification List Container */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {isLoading && notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-[#004337] border-t-transparent rounded-full animate-spin"></div>
                    <span>Memuat notifikasi...</span>
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[24px]">notifications_off</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1">
                      {filterTab === 'unread' ? 'Semua Notifikasi Telah Dibaca' : 'Belum Ada Notifikasi'}
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      {filterTab === 'unread'
                        ? 'Bagus! Anda telah membaca semua notifikasi terbaru.'
                        : 'Pemberitahuan terkait sewa, pembayaran, dan akun kost Anda akan muncul di sini.'}
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((item) => {
                    const { icon, color } = getNotificationIcon(item.type);
                    const isUnread = !item.readAt;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer group relative ${
                          isUnread ? 'bg-emerald-50/35 hover:bg-emerald-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Unread indicator bar on the left */}
                        {isUnread && (
                          <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#004337] rounded-r-full"></div>
                        )}

                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${color}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4
                              className={`text-xs truncate ${
                                isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                              }`}
                            >
                              {item.title}
                            </h4>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-1.5">
                            {item.message}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              <span>{formatTimeAgo(item.createdAt)}</span>
                            </span>
                            {isUnread ? (
                              <span className="text-emerald-700 font-semibold">• Belum dibaca</span>
                            ) : (
                              <span className="text-slate-400">• Sudah dibaca</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons (hover / quick action) */}
                        <div className="absolute right-2.5 top-3 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Tandai sudah dibaca"
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(item.id, e)}
                            disabled={isDeletingId === item.id}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus notifikasi"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isDeletingId === item.id ? 'hourglass_top' : 'delete'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="px-2">Total {notifications.length} notifikasi</span>
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    className="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                    <span>Hapus Semua</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PORTAL MODAL DIALOG (MOUNTED TO DOCUMENT.BODY)          */}
      {/* ======================================================== */}
      {isModalOpen &&
        activeDetailItem &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                      getNotificationIcon(activeDetailItem.type).color
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {getNotificationIcon(activeDetailItem.type).icon}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {activeDetailItem.type.replace(/_/g, ' ')}
                      </span>
                      {activeDetailItem.readAt ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">done</span>
                          <span>Sudah Dibaca</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Belum Dibaca
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {activeDetailItem.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {activeDetailItem.message}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>Diterima pada: {formatFullDate(activeDetailItem.createdAt)}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleDeleteNotification(activeDetailItem.id)}
                  disabled={isDeletingId === activeDetailItem.id}
                  className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isDeletingId === activeDetailItem.id ? 'hourglass_top' : 'delete'}
                  </span>
                  <span>Hapus Notifikasi</span>
                </button>

                <div className="flex items-center gap-2">
                  {!activeDetailItem.readAt && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(activeDetailItem.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Tandai Telah Dibaca</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-[#004337] hover:bg-[#00342b] text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
