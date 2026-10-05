import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { Property } from '../../types';
import { EmptyState, PageHeader, Pill, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { ConfirmDialog, ReasonDialog } from '../../components/ui/Dialogs';
import { useToast } from '../../context/ToastContext';
import { assetUrl, fmtDate, rupiah } from '../../lib/format';
import { reasonLabel } from '../reports/ListingReportPage';

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [active, setActive] = useState(0);

  const { data: p, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => (await api.get(`/admin/properties/${id}`)).data.data as Property,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['property', id] }); qc.invalidateQueries({ queryKey: ['properties'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const suspend = useMutation({
    mutationFn: (reason: string) => api.post(`/admin/properties/${id}/suspend`, { reason }),
    onSuccess: () => { toast('Listing berhasil disuspend.'); setSuspendOpen(false); refresh(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const activate = useMutation({
    mutationFn: () => api.post(`/admin/properties/${id}/activate`),
    onSuccess: () => { toast('Listing berhasil diaktifkan kembali.'); setActivateOpen(false); refresh(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  if (isLoading) return <Spinner />;
  if (!p) return <EmptyState icon="apartment" title="Listing tidak ditemukan" />;
  const photos = p.photos ?? [];

  return (
    <>
      <PageHeader
        back={<Link to="/admin/properties" className="inline-flex items-center gap-1 text-xs font-bold text-ink-400 hover:text-brand-600 mb-2"><span className="material-symbols-outlined text-[16px]">arrow_back</span>Kembali ke Properties</Link>}
        title={p.name}
        subtitle={p.address}
        actions={p.status === 'suspended'
          ? <button className="btn-primary" onClick={() => setActivateOpen(true)}><span className="material-symbols-outlined text-[18px]">restart_alt</span>Reactivate Listing</button>
          : <button className="btn-danger" onClick={() => setSuspendOpen(true)}><span className="material-symbols-outlined text-[18px]">block</span>Suspend Listing</button>}
      />

      {p.status === 'suspended' && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 ring-1 ring-rose-600/20 text-sm text-rose-800 flex gap-2">
          <span className="material-symbols-outlined text-[20px]">gpp_maybe</span>
          <div><b>Listing disuspend.</b> Alasan: {p.suspendedReason || '—'}</div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="aspect-[16/8] bg-ink-100 flex items-center justify-center">
              {photos[active] ? <img src={assetUrl(photos[active].url)} alt={p.name} className="w-full h-full object-cover" /> : <img src="/property-placeholder.svg" alt={p.name} className="w-full h-full object-cover" />}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {photos.map((ph, i) => (
                  <button key={ph.id} onClick={() => setActive(i)} className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 ring-2 transition ${i === active ? 'ring-brand-500' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={assetUrl(ph.url)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-extrabold text-ink-900 mb-2">Deskripsi</h2>
            <p className="text-sm text-ink-600 whitespace-pre-line">{p.description || 'Tidak ada deskripsi.'}</p>
            <div className="flex flex-wrap gap-2 mt-4">{p.facilities?.map((f) => <Pill key={f.id} tone="green">{f.facilityName}</Pill>)}</div>
            {!!p.rules?.length && <ul className="mt-4 list-disc pl-5 text-sm text-ink-600 space-y-1">{p.rules.map((r) => <li key={r.id}>{r.rule}</li>)}</ul>}
          </div>

          <div className="card">
            <div className="px-5 py-4 border-b border-ink-100"><h2 className="font-extrabold text-ink-900">Kamar ({p.rooms?.length ?? 0})</h2></div>
            {!p.rooms?.length ? <EmptyState icon="meeting_room" title="Belum ada kamar" /> : (
              <div className="overflow-x-auto"><table className="w-full">
                <thead className="bg-ink-50/70"><tr><th className="th">No.</th><th className="th">Nama</th><th className="th">Harga</th><th className="th">Status</th></tr></thead>
                <tbody className="divide-y divide-ink-100">{p.rooms.map((r) => (
                  <tr key={r.id}><td className="td font-bold">{r.roomNumber}</td><td className="td">{r.name || '—'}</td><td className="td">{rupiah(r.price)}</td>
                    <td className="td"><Pill tone={r.status === 'available' ? 'green' : r.status === 'occupied' ? 'blue' : 'amber'}>{r.status}</Pill></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="label !mb-0">Status</span><StatusBadge status={p.status} /></div>
            <div><p className="label !mb-0.5">Tipe</p><p className="font-semibold capitalize">Kost {p.type}</p></div>
            <div><p className="label !mb-0.5">Lokasi</p><p className="font-semibold">{[p.district, p.city].filter(Boolean).join(', ') || '—'}</p></div>
            <div><p className="label !mb-0.5">Harga mulai</p><p className="font-semibold">{p.priceStart ? rupiah(p.priceStart) : '—'}</p></div>
            <div><p className="label !mb-0.5">WhatsApp</p><p className="font-semibold">{p.whatsapp}</p></div>
            <div><p className="label !mb-0.5">Dibuat</p><p className="font-semibold">{fmtDate(p.createdAt)}</p></div>
          </div>

          <div className="card p-5">
            <h3 className="font-extrabold text-ink-900 mb-3">Owner</h3>
            <p className="font-bold text-sm">{p.owner?.name}</p>
            <p className="text-xs text-ink-400">{p.owner?.email}</p>
            <p className="text-xs text-ink-400">{p.owner?.phone}</p>
            <Link to={`/admin/owners/${p.owner?.id}`} className="btn-secondary w-full mt-3 !py-2 text-xs">Lihat Owner</Link>
          </div>

          <div className="card p-5">
            <h3 className="font-extrabold text-ink-900 mb-3">Laporan ({p.reports?.length ?? 0})</h3>
            {!p.reports?.length ? <p className="text-xs text-ink-400">Tidak ada laporan.</p> : (
              <ul className="space-y-3">{p.reports.map((r) => (
                <li key={r.id} className="text-xs p-3 rounded-xl bg-ink-50">
                  <div className="flex items-center justify-between mb-1"><b className="text-ink-800">{reasonLabel[r.reason] ?? r.reason}</b><StatusBadge status={r.status} /></div>
                  {r.description && <p className="text-ink-500">{r.description}</p>}
                  <p className="text-ink-400 mt-1">{fmtDate(r.createdAt)}</p>
                </li>
              ))}</ul>
            )}
          </div>
        </div>
      </div>

      <ReasonDialog isOpen={suspendOpen} onClose={() => setSuspendOpen(false)} onSubmit={(r) => suspend.mutateAsync(r)} title="Suspend Listing" description="Listing tidak akan tampil di public dan owner akan menerima alasannya." submitText="Suspend Listing" />
      <ConfirmDialog isOpen={activateOpen} onClose={() => setActivateOpen(false)} onConfirm={() => activate.mutateAsync()} title="Aktifkan Kembali Listing" message={<>Listing <b>{p.name}</b> akan kembali tampil di pencarian publik.</>} confirmText="Aktifkan" />
    </>
  );
};
