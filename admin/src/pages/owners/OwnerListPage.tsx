import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { Owner, PageMeta } from '../../types';
import { Avatar, EmptyState, PageHeader, Pagination, SearchBox, Select, Spinner, StatusBadge, Pill } from '../../components/ui/Feedback';
import { useDebounce } from '../../hooks/useDebounce';
import { fmtDate } from '../../lib/format';

export const OwnerListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['owners', q, status, page],
    queryFn: async () => {
      const r = await api.get('/admin/owners', { params: { search: q || undefined, status: status || undefined, page } });
      return { rows: r.data.data as Owner[], meta: r.data.meta as PageMeta };
    },
    placeholderData: (p) => p,
  });

  return (
    <>
      <PageHeader title="Owners" subtitle="Kelola seluruh pemilik kost yang terdaftar di platform." />
      <div className="card">
        <div className="p-4 flex flex-wrap gap-3 border-b border-ink-100">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama atau email owner…" />
          <Select label="Filter status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
            { value: '', label: 'Semua status' }, { value: 'active', label: 'Aktif' }, { value: 'suspended', label: 'Suspended' }, { value: 'deactivated', label: 'Dinonaktifkan' },
          ]} />
        </div>

        {isLoading ? <Spinner /> : !data?.rows.length ? (
          <EmptyState icon="groups" title="Owner tidak ditemukan" description="Coba ubah kata kunci atau filter." />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="bg-ink-50/70">
                <tr><th className="th">Owner</th><th className="th">Paket</th><th className="th">Properti</th><th className="th">Status</th><th className="th">Terdaftar</th><th className="th" /></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((o) => {
                  const sub = o.subscriptions?.[0];
                  return (
                    <tr key={o.id} className="hover:bg-ink-50/60 transition">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={o.name} />
                          <div><p className="font-bold text-ink-900">{o.name}</p><p className="text-xs text-ink-400">{o.email}</p></div>
                        </div>
                      </td>
                      <td className="td">{sub ? <Pill tone={sub.status === 'trial' ? 'blue' : 'green'}>{sub.plan.name}</Pill> : <Pill>Tidak ada</Pill>}</td>
                      <td className="td font-semibold">{o._count?.properties ?? 0}</td>
                      <td className="td"><StatusBadge status={o.status} /></td>
                      <td className="td text-ink-500">{fmtDate(o.createdAt)}</td>
                      <td className="td text-right"><Link to={`/admin/owners/${o.id}`} className="btn-secondary !py-1.5 !px-3 text-xs">Detail</Link></td>
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
