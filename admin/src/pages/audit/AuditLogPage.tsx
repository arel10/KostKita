import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { AuditLog, PageMeta } from '../../types';
import { EmptyState, PageHeader, Pagination, Pill, SearchBox, Select, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';
import { fmtDateTime } from '../../lib/format';

const entityTypes = ['user', 'property', 'room', 'tenant', 'subscription', 'subscription_payment', 'subscription_plan', 'listing_report', 'system_setting', 'notification'];

const tone = (a: string) => (/suspend|reject|delete/.test(a) ? 'red' : /approve|activate|create|publish/.test(a) ? 'green' : /update|review/.test(a) ? 'blue' : 'gray') as 'red' | 'green' | 'blue' | 'gray';

export const AuditLogPage: React.FC = () => {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<AuditLog | null>(null);
  const a = useDebounce(action);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit', a, entityType, from, to, page],
    queryFn: async () => {
      const r = await api.get('/admin/audit-logs', { params: { action: a || undefined, entityType: entityType || undefined, from: from || undefined, to: to || undefined, page, perPage: 20 } });
      return { rows: r.data.data as AuditLog[], meta: r.data.meta as PageMeta };
    },
    placeholderData: (p) => p,
  });

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Jejak aktivitas penting di seluruh platform." />
      <div className="card">
        <div className="p-4 flex flex-wrap gap-3 border-b border-ink-100 items-center">
          <SearchBox value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="Filter action (mis. owner.suspend)…" />
          <Select label="Entity" value={entityType} onChange={(v) => { setEntityType(v); setPage(1); }} options={[{ value: '', label: 'Semua entity' }, ...entityTypes.map((e) => ({ value: e, label: e }))]} />
          <input type="date" className="input !w-auto" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="Dari tanggal" />
          <span className="text-ink-400 text-sm">s/d</span>
          <input type="date" className="input !w-auto" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="Sampai tanggal" />
        </div>

        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState icon="history" title="Tidak ada log" /> : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full">
              <thead className="bg-ink-50/70"><tr><th className="th">Waktu</th><th className="th">Aktor</th><th className="th">Action</th><th className="th">Entity</th><th className="th">IP</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((l) => (
                  <tr key={l.id} className="hover:bg-ink-50/60 transition">
                    <td className="td whitespace-nowrap text-ink-500">{fmtDateTime(l.createdAt)}</td>
                    <td className="td"><p className="font-semibold">{l.actor?.name ?? 'System'}</p><p className="text-xs text-ink-400">{l.actorRole ?? '—'}</p></td>
                    <td className="td"><Pill tone={tone(l.action)}>{l.action}</Pill></td>
                    <td className="td"><span className="font-mono text-xs">{l.entityType}</span>{l.entityId && <p className="font-mono text-[10px] text-ink-400">{l.entityId.slice(0, 8)}…</p>}</td>
                    <td className="td text-xs text-ink-500">{l.ipAddress ?? '—'}</td>
                    <td className="td text-right"><button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setSel(l)}>Detail</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={data?.meta} onChange={setPage} />
      </div>

      <Modal isOpen={!!sel} onClose={() => setSel(null)} title="Detail Audit Log" description={sel ? `${sel.action} · ${fmtDateTime(sel.createdAt)}` : ''} maxWidth="2xl">
        {sel && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><p className="label !mb-0.5">Aktor</p><p className="font-semibold">{sel.actor?.name ?? 'System'} <span className="text-ink-400">({sel.actor?.email ?? '—'})</span></p></div>
              <div><p className="label !mb-0.5">Entity</p><p className="font-mono text-xs break-all">{sel.entityType} / {sel.entityId ?? '—'}</p></div>
              <div><p className="label !mb-0.5">IP</p><p>{sel.ipAddress ?? '—'}</p></div>
              <div><p className="label !mb-0.5">User agent</p><p className="text-xs text-ink-500 break-all">{sel.userAgent ?? '—'}</p></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><p className="label">Nilai lama</p><pre className="bg-ink-900 text-emerald-200 rounded-xl p-3 text-xs overflow-auto max-h-60">{sel.oldValue ? JSON.stringify(sel.oldValue, null, 2) : '—'}</pre></div>
              <div><p className="label">Nilai baru</p><pre className="bg-ink-900 text-emerald-200 rounded-xl p-3 text-xs overflow-auto max-h-60">{sel.newValue ? JSON.stringify(sel.newValue, null, 2) : '—'}</pre></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
