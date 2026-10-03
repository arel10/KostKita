import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { Plan } from '../../types';
import { EmptyState, PageHeader, Pill, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Dialogs';
import { useToast } from '../../context/ToastContext';
import { rupiah } from '../../lib/format';

export const featureLabel: Record<string, string> = { max_properties: 'Properti', max_rooms: 'Kamar', max_tenants: 'Penghuni aktif' };

export const PlanListPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [del, setDel] = useState<Plan | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get('/admin/plans')).data.data as Plan[] });

  const toggle = useMutation({
    mutationFn: (p: Plan) => api.patch(`/admin/plans/${p.id}`, { isActive: !p.isActive }),
    onSuccess: () => { toast('Status paket diperbarui.'); qc.invalidateQueries({ queryKey: ['plans'] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const remove = useMutation({
    mutationFn: (p: Plan) => api.delete(`/admin/plans/${p.id}`),
    onSuccess: (r) => { toast(r.data?.message ?? 'Paket dihapus.'); setDel(null); qc.invalidateQueries({ queryKey: ['plans'] }); },
    onError: (e) => { toast(errMsg(e), 'error'); setDel(null); },
  });

  return (
    <>
      <PageHeader title="Plans" subtitle="Konfigurasi paket langganan, harga, benefit, dan limit." actions={
        <Link to="/admin/plans/new" id="new-plan" className="btn-primary"><span className="material-symbols-outlined text-[18px]">add</span>Paket Baru</Link>
      } />

      {isLoading ? <Spinner /> : !data?.length ? <EmptyState icon="sell" title="Belum ada paket" /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((p) => (
            <div key={p.id} className={`card p-6 flex flex-col ${!p.isActive ? 'opacity-70' : ''} ${p.isDefault ? 'ring-2 ring-brand-400/50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-ink-900">{p.name}</h3>
                  <p className="text-xs text-ink-400 mt-0.5 min-h-[32px]">{p.description || '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.isDefault && <Pill tone="blue">Default</Pill>}
                  <Pill tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Pill>
                </div>
              </div>

              <p className="mt-4"><span className="text-3xl font-extrabold text-ink-900">{Number(p.price) === 0 ? 'Gratis' : rupiah(p.price)}</span><span className="text-sm text-ink-400"> / {p.durationDays} hari</span></p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f.featureKey} className="flex items-center gap-2 text-sm text-ink-600">
                    <span className="material-symbols-outlined text-brand-600 text-[18px]">check_circle</span>
                    <span className="flex-1">{featureLabel[f.featureKey] ?? f.featureKey}</span>
                    <b className="text-ink-900">{f.featureValue === 'unlimited' ? 'Unlimited' : f.featureValue}</b>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-ink-100">
                <Link to={`/admin/plans/${p.id}/edit`} className="btn-secondary flex-1 !py-2 text-xs"><span className="material-symbols-outlined text-[16px]">edit</span>Edit</Link>
                <button className="btn-ghost !py-2 text-xs" onClick={() => toggle.mutate(p)} disabled={p.isDefault && p.isActive} title={p.isDefault ? 'Paket default tidak dapat dinonaktifkan' : ''}>
                  {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button className="btn-ghost !px-2 !py-2 text-rose-600 hover:!bg-rose-50" onClick={() => setDel(p)} aria-label={`Hapus ${p.name}`} disabled={p.isDefault}>
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={() => remove.mutateAsync(del!)} tone="danger" confirmText="Hapus Paket" title="Hapus Paket"
        message={<>Hapus paket <b>{del?.name}</b>? Bila paket sudah pernah dipakai, paket hanya akan dinonaktifkan agar riwayat tetap utuh.</>} />
    </>
  );
};
