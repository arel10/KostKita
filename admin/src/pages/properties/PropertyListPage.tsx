import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { PageMeta, Property } from '../../types';
import { EmptyState, PageHeader, Pagination, SearchBox, Select, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { useDebounce } from '../../hooks/useDebounce';
import { assetUrl, fmtDate, rupiah } from '../../lib/format';

export const PropertyListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['properties', q, status, page],
    queryFn: async () => {
      const r = await api.get('/admin/properties', { params: { search: q || undefined, status: status || undefined, page } });
      return { rows: r.data.data as Property[], meta: r.data.meta as PageMeta };
    },
    placeholderData: (p) => p,
  });

  return (
    <>
      <PageHeader title="Properties" subtitle="Moderasi seluruh listing kost di platform." />
      <div className="card">
        <div className="p-4 flex flex-wrap gap-3 border-b border-ink-100">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama kost…" />
          <Select label="Filter status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
            { value: '', label: 'Semua status' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }, { value: 'suspended', label: 'Suspended' },
          ]} />
        </div>

        {isLoading ? <Spinner /> : !data?.rows.length ? (
          <EmptyState icon="apartment" title="Listing tidak ditemukan" />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="bg-ink-50/70"><tr><th className="th">Kost</th><th className="th">Owner</th><th className="th">Lokasi</th><th className="th">Harga Mulai</th><th className="th">Status</th><th className="th">Dibuat</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/60 transition">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-ink-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.photos?.[0] ? <img src={assetUrl(p.photos[0].url)} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-ink-300">image</span>}
                        </div>
                        <div><p className="font-bold text-ink-900">{p.name}</p><p className="text-xs text-ink-400 capitalize">Kost {p.type}</p></div>
                      </div>
                    </td>
                    <td className="td"><p className="font-semibold">{p.owner?.name}</p><p className="text-xs text-ink-400">{p.owner?.email}</p></td>
                    <td className="td text-ink-500">{[p.district, p.city].filter(Boolean).join(', ') || '—'}</td>
                    <td className="td font-semibold">{p.priceStart ? rupiah(p.priceStart) : '—'}</td>
                    <td className="td"><StatusBadge status={p.status} /></td>
                    <td className="td text-ink-500">{fmtDate(p.createdAt)}</td>
                    <td className="td text-right"><Link to={`/admin/properties/${p.id}`} className="btn-secondary !py-1.5 !px-3 text-xs">Detail</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={data?.meta} onChange={setPage} />
      </div>
    </>
  );
};
