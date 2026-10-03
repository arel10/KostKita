import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { PageMeta, SubPayment } from '../../types';
import { EmptyState, PageHeader, Pagination, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { fmtDate, fmtDateTime, rupiah } from '../../lib/format';

const tabs = [
  { v: 'pending', l: 'Menunggu' },
  { v: 'approved', l: 'Disetujui' },
  { v: 'rejected', l: 'Ditolak' },
  { v: '', l: 'Semua' },
];

export const PaymentListPage: React.FC = () => {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['payments', status, page],
    queryFn: async () => {
      const r = await api.get('/subscriptions/admin/payments', { params: { status: status || undefined, page } });
      return { rows: r.data.data as SubPayment[], meta: r.data.meta as PageMeta };
    },
    placeholderData: (p) => p,
  });

  return (
    <>
      <PageHeader title="Payment Verification" subtitle="Verifikasi bukti pembayaran subscription dari owner." />
      <div className="card">
        <div className="p-3 border-b border-ink-100 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.l} onClick={() => { setStatus(t.v); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${status === t.v ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-100'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {isLoading ? <Spinner /> : !data?.rows.length ? (
          <EmptyState icon="payments" title="Tidak ada pembayaran" description={status === 'pending' ? 'Semua pembayaran sudah diverifikasi 🎉' : undefined} />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="bg-ink-50/70"><tr><th className="th">Referensi</th><th className="th">Owner</th><th className="th">Paket</th><th className="th">Nominal</th><th className="th">Tgl Bayar</th><th className="th">Metode</th><th className="th">Diajukan</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/60 transition">
                    <td className="td font-mono text-xs font-bold">{p.referenceNo}</td>
                    <td className="td"><p className="font-bold text-ink-900">{p.owner.name}</p><p className="text-xs text-ink-400">{p.owner.email}</p></td>
                    <td className="td font-semibold">{p.plan.name}</td>
                    <td className="td font-bold">{rupiah(p.amount)}</td>
                    <td className="td text-ink-500">{fmtDate(p.paymentDate)}</td>
                    <td className="td text-ink-500 capitalize">{p.paymentMethod}</td>
                    <td className="td text-ink-500 whitespace-nowrap">{fmtDateTime(p.createdAt)}</td>
                    <td className="td"><StatusBadge status={p.status} /></td>
                    <td className="td text-right"><Link to={`/admin/payments/${p.id}`} className={p.status === 'pending' ? 'btn-primary !py-1.5 !px-3 text-xs' : 'btn-secondary !py-1.5 !px-3 text-xs'}>{p.status === 'pending' ? 'Tinjau' : 'Detail'}</Link></td>
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
