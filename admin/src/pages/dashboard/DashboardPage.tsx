import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';
import type { DashboardData } from '../../types';
import { PageHeader, Spinner, StatCard } from '../../components/ui/Feedback';
import { compactRupiah, rupiah, timeAgo } from '../../lib/format';

const reasonLabel: Record<string, string> = {
  info_not_match: 'Informasi tidak sesuai',
  whatsapp_inactive: 'WhatsApp tidak aktif',
  not_available: 'Kost tidak tersedia',
  location_not_match: 'Lokasi tidak sesuai',
  inappropriate_content: 'Konten tidak pantas',
  fraud: 'Penipuan / mencurigakan',
  other: 'Lainnya',
};

interface Item { icon: string; tone: string; title: string; sub: string; at: string; to?: string }

export const DashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/admin/dashboard')).data.data as DashboardData,
  });

  if (isLoading || !data) return <Spinner />;
  const a = data.recentActivity;

  const activity: Item[] = [
    ...a.owners.map((o) => ({ icon: 'person_add', tone: 'bg-sky-100 text-sky-700', title: 'Owner baru', sub: `${o.name} · ${o.email}`, at: o.createdAt, to: `/admin/owners/${o.id}` })),
    ...a.subscriptions.map((s) => ({ icon: 'card_membership', tone: 'bg-emerald-100 text-emerald-700', title: 'Subscription baru', sub: `${s.owner.name} · ${s.plan.name}`, at: s.createdAt, to: '/admin/subscriptions' })),
    ...a.payments.map((p) => ({ icon: 'pending_actions', tone: 'bg-amber-100 text-amber-700', title: 'Pembayaran menunggu', sub: `${p.owner.name} · ${p.plan.name} · ${rupiah(p.amount)}`, at: p.createdAt, to: `/admin/payments/${p.id}` })),
    ...a.properties.map((p) => ({ icon: 'apartment', tone: 'bg-violet-100 text-violet-700', title: 'Listing baru', sub: `${p.name} · ${p.owner.name}`, at: p.createdAt, to: `/admin/properties/${p.id}` })),
    ...a.reports.map((r) => ({ icon: 'flag', tone: 'bg-rose-100 text-rose-700', title: 'Report baru', sub: `${r.property.name} · ${reasonLabel[r.reason] ?? r.reason}`, at: r.createdAt, to: '/admin/listing-reports' })),
    ...a.suspends.map((s) => ({ icon: 'block', tone: 'bg-ink-200 text-ink-700', title: s.action === 'owner.suspend' ? 'Owner disuspend' : 'Listing disuspend', sub: `oleh ${s.actor?.name ?? 'admin'}`, at: s.createdAt, to: '/admin/audit-logs' })),
  ]
    .sort((x, y) => +new Date(y.at) - +new Date(x.at))
    .slice(0, 12);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Ringkasan kondisi platform KostKita saat ini." />

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard delay={0} label="Total Owner" value={data.totalOwners} icon="groups" tone="sky" />
        <StatCard delay={40} label="Owner Aktif" value={data.activeOwners} icon="verified_user" tone="brand" />
        <StatCard delay={80} label="Owner Suspended" value={data.suspendedOwners} icon="block" tone="rose" />
        <StatCard delay={120} label="Total Properti" value={data.totalProperties} icon="apartment" tone="violet" />
        <StatCard delay={160} label="Listing Aktif" value={data.activeListings} icon="visibility" tone="brand" />
        <StatCard delay={200} label="Listing Nonaktif" value={data.inactiveListings} icon="visibility_off" tone="amber" hint="Inactive + suspended" />
        <StatCard delay={240} label="Pembayaran Pending" value={data.pendingPayments} icon="pending_actions" tone="amber" hint={data.pendingPayments ? 'Perlu diverifikasi' : 'Semua beres'} />
        <StatCard delay={280} label="Revenue Bulan Ini" value={compactRupiah(data.monthlyRevenue)} icon="account_balance_wallet" tone="brand" hint={rupiah(data.monthlyRevenue)} />
        <StatCard delay={320} label="Subscription Aktif" value={data.activeSubscriptions} icon="card_membership" tone="sky" />
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mt-6">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-extrabold text-ink-900">Revenue Subscription</h2>
              <p className="text-xs text-ink-400">6 bulan terakhir (pembayaran disetujui)</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} tickFormatter={(v) => compactRupiah(v)} width={70} />
                <Tooltip formatter={(v) => rupiah(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #dde4ee' }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-extrabold text-ink-900">Owner Baru</h2>
          <p className="text-xs text-ink-400 mb-4">Pendaftaran per bulan</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend} margin={{ left: -25, right: 4, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #dde4ee' }} cursor={{ fill: '#f6f8fb' }} />
                <Bar dataKey="owners" name="Owner" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="font-extrabold text-ink-900">Aktivitas Platform</h2>
          {data.pendingReports > 0 && (
            <Link to="/admin/listing-reports" className="text-xs font-bold text-rose-600 hover:underline">{data.pendingReports} report belum ditinjau →</Link>
          )}
        </div>
        {activity.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-400">Belum ada aktivitas.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {activity.map((i, idx) => {
              const inner = (
                <>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${i.tone}`}>
                    <span className="material-symbols-outlined text-[18px]">{i.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink-800">{i.title}</p>
                    <p className="text-xs text-ink-500 truncate">{i.sub}</p>
                  </div>
                  <span className="text-[11px] text-ink-400 whitespace-nowrap">{timeAgo(i.at)}</span>
                </>
              );
              return (
                <li key={idx}>
                  {i.to ? <Link to={i.to} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50 transition">{inner}</Link> : <div className="flex items-center gap-3 px-5 py-3">{inner}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
};
