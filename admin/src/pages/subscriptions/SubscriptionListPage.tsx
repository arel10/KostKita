import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { PageMeta, Plan, Subscription } from '../../types';
import { Avatar, EmptyState, PageHeader, Pagination, Pill, SearchBox, Select, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { useDebounce } from '../../hooks/useDebounce';
import { daysLeft, fmtDate } from '../../lib/format';

export const SubscriptionListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get('/admin/plans')).data.data as Plan[] });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['subscriptions', q, status, planId, page],
    queryFn: async () => {
      const r = await api.get('/admin/subscriptions', { params: { search: q || undefined, status: status || undefined, planId: planId || undefined, page } });
      return { rows: r.data.data as Subscription[], meta: r.data.meta as PageMeta };
    },
    placeholderData: (p) => p,
  });

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Pantau seluruh langganan owner beserta masa berlakunya." />
      <div className="card">
        <div className="p-4 flex flex-wrap gap-3 border-b border-ink-100">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari owner…" />
          <Select label="Filter status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
            { value: '', label: 'Semua status' }, { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Aktif' }, { value: 'expiring_soon', label: 'Segera berakhir' }, { value: 'expired', label: 'Kedaluwarsa' }, { value: 'cancelled', label: 'Dibatalkan' },
          ]} />
          <Select label="Filter paket" value={planId} onChange={(v) => { setPlanId(v); setPage(1); }} options={[{ value: '', label: 'Semua paket' }, ...(plans ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        </div>

        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState icon="card_membership" title="Subscription tidak ditemukan" /> : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="bg-ink-50/70"><tr><th className="th">Owner</th><th className="th">Paket</th><th className="th">Status</th><th className="th">Mulai</th><th className="th">Berakhir</th><th className="th">Sisa</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((s) => {
                  const live = ['trial', 'active', 'expiring_soon'].includes(s.status);
                  const left = daysLeft(s.endsAt);
                  return (
                    <tr key={s.id} className="hover:bg-ink-50/60 transition">
                      <td className="td"><div className="flex items-center gap-3"><Avatar name={s.owner.name} /><div><p className="font-bold text-ink-900">{s.owner.name}</p><p className="text-xs text-ink-400">{s.owner.email}</p></div></div></td>
                      <td className="td"><Pill tone={s.status === 'trial' ? 'blue' : 'green'}>{s.plan.name}</Pill></td>
                      <td className="td"><StatusBadge status={s.status} /></td>
                      <td className="td text-ink-500">{fmtDate(s.startsAt)}</td>
                      <td className="td text-ink-500">{fmtDate(s.endsAt)}</td>
                      <td className={`td font-bold ${live && left <= 3 ? 'text-rose-600' : 'text-ink-700'}`}>{live ? `${Math.max(0, left)} hari` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={data?.meta} onChange={setPage} />
      </div>
    </>
  );
};
