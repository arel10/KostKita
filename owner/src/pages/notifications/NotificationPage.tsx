import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { NotificationItem } from '../../types';

export const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'subscription_expiring':
      case 'subscription_expired':
        return { icon: 'schedule', color: 'bg-amber-100 text-amber-700' };
      case 'payment_approved':
        return { icon: 'verified', color: 'bg-emerald-100 text-emerald-700' };
      case 'payment_rejected':
        return { icon: 'cancel', color: 'bg-red-100 text-red-700' };
      default:
        return { icon: 'notifications', color: 'bg-blue-100 text-blue-700' };
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pusat Notifikasi & Log Sistem
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemberitahuan penting masa aktif langganan, verifikasi pembayaran, dan aktivitas properti.
          </p>
        </div>

        {unreadCount > 0 && (
          <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
            {unreadCount} Belum Dibaca
          </span>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <LoadingSpinner label="Memuat pemberitahuan..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications_off"
          title="Tidak Ada Notifikasi"
          description="Saat ini belum ada pengumuman atau pemberitahuan sistem baru."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map((item) => {
            const { icon, color } = getNotificationIcon(item.type);
            const isUnread = !item.readAt;

            return (
              <div
                key={item.id}
                onClick={() => isUnread && handleMarkAsRead(item.id)}
                className={`p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                  isUnread ? 'bg-primary-fixed/10 hover:bg-primary-fixed/20' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900">{item.title}</h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {isUnread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(item.id);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline shrink-0"
                  >
                    Tandai Dibaca
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
