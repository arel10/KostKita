import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { ListingReport, PageMeta } from '../../types';
import { EmptyState, PageHeader, Pagination, Pill, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { ReasonDialog } from '../../components/ui/Dialogs';
import { useToast } from '../../context/ToastContext';
import { fmtDateTime } from '../../lib/format';

export const reasonLabel: Record<string, string> = {
  info_not_match: 'Informasi tidak sesuai',
  whatsapp_inactive: 'WhatsApp tidak aktif',
  not_available: 'Kost tidak tersedia',
  location_not_match: 'Lokasi tidak sesuai',
  inappropriate_content: 'Konten tidak pantas',
  fraud: 'Penipuan / mencurigakan',
  other: 'Lainnya',
};

const tabs = [{ v: 'pending', l: 'Baru' }, { v: 'reviewed', l: 'Ditinjau' }, { v: 'resolved', l: 'Selesai' }, { v: '', l: 'Semua' }];

export const ListingReportPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<ListingReport | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['listing-reports', status, page],
    queryFn: async () => {
      const r = await api.get('/admin/listing-reports', { params: { status: status || undefined, page } });
      return { rows: r.data.data as ListingReport[], meta: r.data.meta as PageMeta };
    },
    placeholderData: (p) => p,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['listing-reports'] }); qc.invalidateQueries({ queryKey: ['badge-counts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const setStatusM = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => api.patch(`/admin/listing-reports/${id}`, { status: s }),
    onSuccess: () => { toast('Status laporan diperbarui.'); refresh(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  const suspend = useMutation({
    mutationFn: async ({ r, reason }: { r: ListingReport; reason: string }) => {
      await api.post(`/admin/properties/${r.property!.id}/suspend`, { reason });
      await api.patch(`/admin/listing-reports/${r.id}`, { status: 'resolved' });
    },
    onSuccess: () => { toast('Listing disuspend & laporan diselesaikan.'); setSuspendTarget(null); refresh(); qc.invalidateQueries({ queryKey: ['properties'] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  return (
    <>
      <PageHeader title="Listing Reports" subtitle="Laporan dari pengguna publik terhadap listing bermasalah." />
      <div className="card">
        <div className="p-3 border-b border-ink-100 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.l} onClick={() => { setStatus(t.v); setPage(1); }} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${status === t.v ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-100'}`}>{t.l}</button>
          ))}
        </div>

        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState icon="flag" title="Tidak ada laporan" description="Belum ada laporan pada kategori ini." /> : (
          <ul className={`divide-y divide-ink-100 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            {data.rows.map((r) => (
              <li key={r.id} className="p-5 flex flex-wrap items-start gap-4 hover:bg-ink-50/50 transition">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[20px]">flag</span></div>
                <div className="flex-1 min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="red">{reasonLabel[r.reason] ?? r.reason}</Pill>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-2 text-sm">Listing: {r.property ? <Link to={`/admin/properties/${r.property.id}`} className="font-bold text-brand-700 hover:underline">{r.property.name}</Link> : '—'}</p>
                  {r.description && <p className="mt-1 text-sm text-ink-600">“{r.description}”</p>}
                  <p className="mt-2 text-xs text-ink-400">Pelapor: {r.reporterName || 'Anonim'}{r.reporterContact ? ` · ${r.reporterContact}` : ''} · {fmtDateTime(r.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.status === 'pending' && <button className="btn-secondary !py-1.5 text-xs" onClick={() => setStatusM.mutate({ id: r.id, s: 'reviewed' })}>Tandai ditinjau</button>}
                  {r.status !== 'resolved' && <button className="btn-secondary !py-1.5 text-xs" onClick={() => setStatusM.mutate({ id: r.id, s: 'resolved' })}>Selesai</button>}
                  {r.status !== 'resolved' && r.property && <button className="btn-danger !py-1.5 text-xs" onClick={() => setSuspendTarget(r)}>Suspend listing</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={data?.meta} onChange={setPage} />
      </div>

      <ReasonDialog isOpen={!!suspendTarget} onClose={() => setSuspendTarget(null)} onSubmit={(reason) => suspend.mutateAsync({ r: suspendTarget!, reason })}
        title="Suspend Listing" description={`Listing "${suspendTarget?.property?.name}" akan disuspend dan laporan ditandai selesai.`} submitText="Suspend Listing" />
    </>
  );
};
