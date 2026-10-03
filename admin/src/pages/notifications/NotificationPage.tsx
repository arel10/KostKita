import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { NotificationItem } from '../../types';
import { EmptyState, PageHeader, Pill, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../context/ToastContext';
import { fmtDateTime } from '../../lib/format';

const typeMeta: Record<string, { label: string; tone: 'blue' | 'red' | 'green' | 'amber' | 'violet' }> = {
  system_announcement: { label: 'Pengumuman', tone: 'violet' },
  owner_suspended: { label: 'Owner suspended', tone: 'red' },
  listing_suspended: { label: 'Listing suspended', tone: 'red' },
  payment_approved: { label: 'Pembayaran disetujui', tone: 'green' },
  payment_rejected: { label: 'Pembayaran ditolak', tone: 'amber' },
};
const targetLabel: Record<string, string> = { all: 'Semua owner', active: 'Owner aktif', suspended: 'Owner suspended' };

export const NotificationPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');

  const { data, isLoading } = useQuery({ queryKey: ['admin-notifications'], queryFn: async () => (await api.get('/admin/notifications')).data.data as NotificationItem[] });

  const send = useMutation({
    mutationFn: () => api.post('/admin/notifications/announcement', { title: title.trim(), message: message.trim(), target }),
    onSuccess: (r) => { toast(`Pengumuman terkirim ke ${r.data.data.recipients} owner.`); setTitle(''); setMessage(''); qc.invalidateQueries({ queryKey: ['admin-notifications'] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  const valid = title.trim().length >= 3 && message.trim().length >= 5;

  return (
    <>
      <PageHeader title="Notifications" subtitle="Kirim pengumuman sistem dan pantau notifikasi platform." />
      <div className="grid lg:grid-cols-5 gap-4">
        <form className="card p-6 lg:col-span-2 h-fit space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) send.mutate(); }}>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-brand-600">campaign</span><h2 className="font-extrabold text-ink-900">System Announcement</h2></div>
          <div><label className="label" htmlFor="a-title">Judul</label><input id="a-title" className="input" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="contoh: Jadwal maintenance sistem" /></div>
          <div><label className="label" htmlFor="a-msg">Pesan</label><textarea id="a-msg" className="input min-h-[130px]" value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} /><p className="text-[11px] text-ink-400 mt-1 text-right">{message.length}/2000</p></div>
          <div><label className="label" htmlFor="a-target">Penerima</label>
            <select id="a-target" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all">Semua owner</option><option value="active">Owner aktif saja</option><option value="suspended">Owner suspended saja</option>
            </select></div>
          <button id="send-announcement" className="btn-primary w-full !py-3" disabled={!valid || send.isPending}>
            <span className="material-symbols-outlined text-[18px]">send</span>{send.isPending ? 'Mengirim…' : 'Kirim Pengumuman'}
          </button>
        </form>

        <div className="card lg:col-span-3">
          <div className="px-5 py-4 border-b border-ink-100"><h2 className="font-extrabold text-ink-900">Riwayat Notifikasi</h2></div>
          {isLoading ? <Spinner /> : !data?.length ? <EmptyState icon="notifications_off" title="Belum ada notifikasi" /> : (
            <ul className="divide-y divide-ink-100 max-h-[640px] overflow-y-auto">
              {data.map((n) => {
                const m = typeMeta[n.type] ?? { label: n.type, tone: 'blue' as const };
                return (
                  <li key={n.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1"><Pill tone={m.tone}>{m.label}</Pill>
                      <span className="text-[11px] text-ink-400">{fmtDateTime(n.createdAt)}</span>
                      <span className="text-[11px] text-ink-400 ml-auto">{n.target ? `${targetLabel[n.target] ?? n.target} · ` : n.to ? `${n.to} · ` : ''}{n.recipients} penerima</span></div>
                    <p className="font-bold text-sm text-ink-900">{n.title}</p>
                    <p className="text-sm text-ink-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};
