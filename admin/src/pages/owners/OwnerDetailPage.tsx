import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { Owner } from '../../types';
import { Avatar, EmptyState, PageHeader, Pill, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { ConfirmDialog, ReasonDialog } from '../../components/ui/Dialogs';
import { useToast } from '../../context/ToastContext';
import { daysLeft, fmtDate, fmtDateTime } from '../../lib/format';

export const OwnerDetailPage: React.FC = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);

  const { data: owner, isLoading } = useQuery({
    queryKey: ['owner', id],
    queryFn: async () => (await api.get(`/admin/owners/${id}`)).data.data as Owner & { subscriptions: any[]; properties: any[] },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['owner', id] }); qc.invalidateQueries({ queryKey: ['owners'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const suspend = useMutation({
    mutationFn: (reason: string) => api.post(`/admin/owners/${id}/suspend`, { reason }),
    onSuccess: () => { toast('Owner berhasil disuspend.'); setSuspendOpen(false); refresh(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const activate = useMutation({
    mutationFn: () => api.post(`/admin/owners/${id}/activate`),
    onSuccess: () => { toast('Owner berhasil diaktifkan.'); setActivateOpen(false); refresh(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  if (isLoading) return <Spinner />;
  if (!owner) return <EmptyState icon="person_off" title="Owner tidak ditemukan" />;

  const current = owner.subscriptions.find((s) => ['trial', 'active', 'expiring_soon'].includes(s.status));

  return (
    <>
      <PageHeader
        back={<Link to="/admin/owners" className="inline-flex items-center gap-1 text-xs font-bold text-ink-400 hover:text-brand-600 mb-2"><span className="material-symbols-outlined text-[16px]">arrow_back</span>Kembali ke Owners</Link>}
        title={owner.name}
        subtitle={owner.email}
        actions={owner.status === 'active'
          ? <button className="btn-danger" onClick={() => setSuspendOpen(true)}><span className="material-symbols-outlined text-[18px]">block</span>Suspend Owner</button>
          : <button className="btn-primary" onClick={() => setActivateOpen(true)}><span className="material-symbols-outlined text-[18px]">check_circle</span>Aktifkan Owner</button>}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4"><Avatar name={owner.name} size={52} /><div><StatusBadge status={owner.status} /></div></div>
          <dl className="space-y-3 text-sm">
            <div><dt className="label !mb-0.5">Telepon</dt><dd className="font-semibold">{owner.phone || '—'}</dd></div>
            <div><dt className="label !mb-0.5">Terdaftar</dt><dd className="font-semibold">{fmtDateTime(owner.createdAt)}</dd></div>
            <div><dt className="label !mb-0.5">Login terakhir</dt><dd className="font-semibold">{fmtDateTime(owner.lastLoginAt)}</dd></div>
          </dl>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="font-extrabold text-ink-900 mb-3">Subscription Saat Ini</h2>
          {current ? (
            <div className="flex flex-wrap items-center gap-6">
              <div><p className="label !mb-1">Paket</p><Pill tone={current.status === 'trial' ? 'blue' : 'green'}>{current.plan.name}</Pill></div>
              <div><p className="label !mb-1">Status</p><StatusBadge status={current.status} /></div>
              <div><p className="label !mb-1">Berakhir</p><p className="font-bold">{fmtDate(current.endsAt)}</p></div>
              <div><p className="label !mb-1">Sisa</p><p className="font-bold">{Math.max(0, daysLeft(current.endsAt))} hari</p></div>
            </div>
          ) : <p className="text-sm text-ink-400">Tidak ada subscription aktif.</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="card">
          <div className="px-5 py-4 border-b border-ink-100"><h2 className="font-extrabold text-ink-900">Kost Milik Owner ({owner.properties.length})</h2></div>
          {owner.properties.length === 0 ? <EmptyState icon="apartment" title="Belum ada kost" /> : (
            <ul className="divide-y divide-ink-100">
              {owner.properties.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/properties/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink-50 transition">
                    <div><p className="font-bold text-sm text-ink-800">{p.name}</p><p className="text-xs text-ink-400">{p._count?.rooms ?? 0} kamar · {p.city ?? '—'}</p></div>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-ink-100"><h2 className="font-extrabold text-ink-900">Riwayat Subscription</h2></div>
          {owner.subscriptions.length === 0 ? <EmptyState icon="card_membership" title="Belum ada riwayat" /> : (
            <ul className="divide-y divide-ink-100">
              {owner.subscriptions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div><p className="font-bold text-sm text-ink-800">{s.plan.name}</p><p className="text-xs text-ink-400">{fmtDate(s.startsAt)} → {fmtDate(s.endsAt)}</p></div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ReasonDialog isOpen={suspendOpen} onClose={() => setSuspendOpen(false)} onSubmit={(r) => suspend.mutateAsync(r)} title="Suspend Owner" description="Semua listing owner akan dinonaktifkan dan owner diberi tahu alasannya." submitText="Suspend Owner" />
      <ConfirmDialog isOpen={activateOpen} onClose={() => setActivateOpen(false)} onConfirm={() => activate.mutateAsync()} title="Aktifkan Owner" message={<>Owner <b>{owner.name}</b> akan dapat menggunakan dashboard kembali. Listing perlu diaktifkan ulang secara terpisah.</>} confirmText="Aktifkan" />
    </>
  );
};
