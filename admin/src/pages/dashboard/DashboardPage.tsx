import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../lib/api';
import type { DashboardData } from '../../types';
import { Spinner } from '../../components/ui/Feedback';
import { compactRupiah, rupiah, timeAgo } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const reasonLabel: Record<string, string> = {
  info_not_match: 'Informasi tidak sesuai',
  whatsapp_inactive: 'WhatsApp tidak aktif',
  not_available: 'Kost tidak tersedia',
  location_not_match: 'Lokasi tidak sesuai',
  inappropriate_content: 'Konten tidak pantas',
  fraud: 'Penipuan / mencurigakan',
  other: 'Lainnya',
};

interface ActivityItem {
  type: 'owner' | 'subscription' | 'payment' | 'property' | 'report' | 'suspend';
  icon: string;
  tone: string;
  badgeTone: string;
  title: string;
  sub: string;
  at: string;
  to?: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'finance' | 'owners' | 'properties' | 'activity'>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/admin/dashboard')).data.data as DashboardData,
  });

  const allActivity = useMemo<ActivityItem[]>(() => {
    if (!data?.recentActivity) return [];
    const a = data.recentActivity;

    const list: ActivityItem[] = [
      ...a.owners.map((o) => ({
        type: 'owner' as const,
        icon: 'person_add',
        tone: 'bg-sky-50 text-sky-700 border-sky-200',
        badgeTone: 'bg-sky-100 text-sky-800',
        title: 'Pendaftaran Owner Baru',
        sub: `${o.name} • ${o.email}`,
        at: o.createdAt,
        to: `/admin/owners/${o.id}`,
      })),
      ...a.subscriptions.map((s) => ({
        type: 'subscription' as const,
        icon: 'card_membership',
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeTone: 'bg-emerald-100 text-emerald-800',
        title: 'Paket Langganan Diaktifkan',
        sub: `${s.owner.name} • ${s.plan.name}`,
        at: s.createdAt,
        to: '/admin/subscriptions',
      })),
      ...a.payments.map((p) => ({
        type: 'payment' as const,
        icon: 'payments',
        tone: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeTone: 'bg-amber-100 text-amber-800',
        title: 'Pembayaran Menunggu Verifikasi',
        sub: `${p.owner.name} • ${p.plan.name} • ${rupiah(p.amount)}`,
        at: p.createdAt,
        to: `/admin/payments/${p.id}`,
      })),
      ...a.properties.map((p) => ({
        type: 'property' as const,
        icon: 'apartment',
        tone: 'bg-violet-50 text-violet-700 border-violet-200',
        badgeTone: 'bg-violet-100 text-violet-800',
        title: 'Listing Properti Didaftarkan',
        sub: `${p.name} • Pemilik: ${p.owner.name}`,
        at: p.createdAt,
        to: `/admin/properties/${p.id}`,
      })),
      ...a.reports.map((r) => ({
        type: 'report' as const,
        icon: 'flag',
        tone: 'bg-rose-50 text-rose-700 border-rose-200',
        badgeTone: 'bg-rose-100 text-rose-800',
        title: 'Laporan Pelanggaran Listing Masuk',
        sub: `${r.property.name} • Alasan: ${reasonLabel[r.reason] ?? r.reason}`,
        at: r.createdAt,
        to: '/admin/listing-reports',
      })),
      ...a.suspends.map((s) => ({
        type: 'suspend' as const,
        icon: 'block',
        tone: 'bg-slate-100 text-slate-700 border-slate-300',
        badgeTone: 'bg-slate-200 text-slate-800',
        title: s.action === 'owner.suspend' ? 'Penangguhan Akun Owner' : 'Penangguhan Listing Kost',
        sub: `Diproses oleh ${s.actor?.name ?? 'Admin Sistem'}`,
        at: s.createdAt,
        to: '/admin/audit-logs',
      })),
    ];

    return list.sort((x, y) => +new Date(y.at) - +new Date(x.at));
  }, [data?.recentActivity]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return allActivity;
    return allActivity.filter((item) => item.type === activityFilter);
  }, [allActivity, activityFilter]);

  if (isLoading || !data) {
    return <Spinner label="Memuat metrik dan analitik Super Admin..." />;
  }

  // Active listing percentage
  const totalListingsCount = data.totalProperties || 1;
  const activeListingPct = Math.round((data.activeListings / totalListingsCount) * 100) || 0;

  // Active owners percentage
  const totalOwnersCount = data.totalOwners || 1;
  const activeOwnersPct = Math.round((data.activeOwners / totalOwnersCount) * 100) || 0;

  return (
    <div className="space-y-8 pb-12">
      {/* ── 1. HERO GREETING & ACTION HUB ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-700/50">
        <div className="absolute right-[-40px] top-[-40px] w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 bottom-[-50px] w-64 h-64 rounded-full bg-amber-500/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold border border-white/10 mb-3 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sistem Operasional Normal & Real-Time</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Halo, {user?.name || 'Super Admin'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Ringkasan performa bisnis langganan SaaS, verifikasi akun pemilik kost, dan pengawasan katalog properti KostKita.
            </p>

            {/* Action Highlights */}
            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              {data.pendingPayments > 0 ? (
                <Link
                  to="/admin/payments"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                  <span>{data.pendingPayments} Pembayaran Menunggu Konfirmasi</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Semua Pembayaran Beres</span>
                </span>
              )}

              {data.pendingReports > 0 && (
                <Link
                  to="/admin/listing-reports"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">flag</span>
                  <span>{data.pendingReports} Laporan Perlu Tindakan</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 shrink-0">
            <Link
              to="/admin/payments"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-amber-400 text-[20px]">payments</span>
                <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors text-[16px]">arrow_forward</span>
              </div>
              <span className="text-[11px] font-bold text-slate-200">Verifikasi Bayar</span>
              <span className="text-[10px] text-slate-400">{data.pendingPayments} pending</span>
            </Link>

            <Link
              to="/admin/plans"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">sell</span>
                <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors text-[16px]">arrow_forward</span>
              </div>
              <span className="text-[11px] font-bold text-slate-200">Atur Paket Plan</span>
              <span className="text-[10px] text-slate-400">Harga & fitur</span>
            </Link>

            <Link
              to="/admin/owners"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-sky-400 text-[20px]">groups</span>
                <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors text-[16px]">arrow_forward</span>
              </div>
              <span className="text-[11px] font-bold text-slate-200">Kelola Owner</span>
              <span className="text-[10px] text-slate-400">{data.totalOwners} terdaftar</span>
            </Link>

            <Link
              to="/admin/notifications"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-purple-400 text-[20px]">campaign</span>
                <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors text-[16px]">arrow_forward</span>
              </div>
              <span className="text-[11px] font-bold text-slate-200">Kirim Siaran</span>
              <span className="text-[10px] text-slate-400">Notifikasi publik</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. CATEGORY TABS SELECTOR ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveCategoryTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategoryTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">grid_view</span>
          <span>Semua Kategori</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('finance')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategoryTab === 'finance'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">payments</span>
          <span>Keuangan & Bisnis</span>
          {data.pendingPayments > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
              {data.pendingPayments}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('owners')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategoryTab === 'owners'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">groups</span>
          <span>Pemilik Kost (Owners)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('properties')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategoryTab === 'properties'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">apartment</span>
          <span>Properti & Listing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeCategoryTab === 'activity'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">history</span>
          <span>Log & Aktivitas</span>
        </button>
      </div>

      {/* ── 3. KATEGORI 1: KEUANGAN & BISNIS ── */}
      {(activeCategoryTab === 'all' || activeCategoryTab === 'finance') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[19px]">payments</span>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Kategori Keuangan & Pendapatan Langganan
                </h2>
                <p className="text-xs text-slate-500">
                  Arus kas pembayaran paket subscription pemilik kost dan verifikasi transaksi.
                </p>
              </div>
            </div>
            <Link
              to="/admin/payments"
              className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Buka Menu Pembayaran</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          {/* Cards Keuangan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Revenue Bulan Ini */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue Bulan Ini</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-emerald-700 block">
                  {compactRupiah(data.monthlyRevenue)}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                  {rupiah(data.monthlyRevenue)} (Bulan Berjalan)
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Total akumulasi sewa plan</span>
                <span className="font-bold text-emerald-700">Terverifikasi</span>
              </div>
            </div>

            {/* Card 2: Pembayaran Menunggu Konfirmasi */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pembayaran Pending</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">pending_actions</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-amber-700 block">
                  {data.pendingPayments} Tagihan
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {data.pendingPayments > 0 ? 'Menunggu persetujuan admin' : 'Tidak ada antrean'}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Aksi segera</span>
                <Link to="/admin/payments" className="font-bold text-amber-700 hover:underline">
                  Verifikasi Sekarang →
                </Link>
              </div>
            </div>

            {/* Card 3: Subscription Aktif */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Langganan Aktif</span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">card_membership</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-900 block">
                  {data.activeSubscriptions} Owner
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Termasuk paket Basic, Pro, dan Trial
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Paket plan aktif</span>
                <Link to="/admin/subscriptions" className="font-bold text-sky-700 hover:underline">
                  Rincian Langganan →
                </Link>
              </div>
            </div>
          </div>

          {/* Area Chart: Tren Pendapatan 6 Bulan */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Tren Pendapatan Subscription Platform</h3>
                <p className="text-xs text-slate-400">Total pendapatan yang disetujui dalam 6 bulan terakhir</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                Arus Kas Masuk Bulanan
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => compactRupiah(v)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v) => [rupiah(Number(v)), 'Pendapatan']}
                    contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#059669"
                    strokeWidth={3}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. KATEGORI 2: MANAJEMEN PEMILIK KOST (OWNERS) ── */}
      {(activeCategoryTab === 'all' || activeCategoryTab === 'owners') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[19px]">groups</span>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Kategori Pengguna & Mitra Pemilik Kost (Owners)
                </h2>
                <p className="text-xs text-slate-500">
                  Statistik akun pemilik kost terdaftar, tingkat keaktifan akun, dan penangguhan.
                </p>
              </div>
            </div>
            <Link
              to="/admin/owners"
              className="text-xs font-bold text-sky-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Kelola Seluruh Owner</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Stat Cards Owner */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Owner Terdaftar</span>
                  <span className="text-2xl font-black text-slate-900 block mt-0.5">{data.totalOwners} Akun</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Seluruh basis mitra terdaftar</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">groups</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Owner Aktif</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-emerald-700">{data.activeOwners}</span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {activeOwnersPct}% dari total
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Dapat mengelola unit & tagihan</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">verified_user</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Owner Suspended</span>
                  <span className="text-2xl font-black text-rose-700 block mt-0.5">{data.suspendedOwners} Akun</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Akses dinonaktifkan sementara</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">block</span>
                </div>
              </div>
            </div>

            {/* Bar Chart: Owner Baru per Bulan */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-slate-900 text-sm">Pertumbuhan Pendaftaran Owner Baru</h3>
                  <span className="text-xs text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                    Mitra Baru 6 Bulan
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">Jumlah registrasi mitra pemilik kost tiap bulan</p>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trend} margin={{ left: -20, right: 4, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="owners" name="Owner Baru" fill="#0284c7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. KATEGORI 3: PROPERTI & KATALOG UNIT KOST ── */}
      {(activeCategoryTab === 'all' || activeCategoryTab === 'properties') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[19px]">apartment</span>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Kategori Katalog Properti & Listing Kost
                </h2>
                <p className="text-xs text-slate-500">
                  Pengawasan ketersediaan listing kost yang tayang di halaman pencarian publik.
                </p>
              </div>
            </div>
            <Link
              to="/admin/properties"
              className="text-xs font-bold text-violet-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Daftar Seluruh Properti</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Properti</span>
                <span className="material-symbols-outlined text-violet-600 text-[22px]">apartment</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-900 block">{data.totalProperties} Properti</span>
                <span className="text-xs text-slate-500 mt-0.5 block">Tersebar di berbagai kota</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Basis database</span>
                <Link to="/admin/properties" className="text-violet-700 font-bold hover:underline">Lihat Detail →</Link>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Listing Aktif (Tayang)</span>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">visibility</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-700">{data.activeListings} Listing</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {activeListingPct}%
                  </span>
                </div>
                <span className="text-xs text-slate-500 mt-0.5 block">Dapat dicari calon penyewa</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Siap dihubungi via WhatsApp</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Listing Nonaktif / Suspended</span>
                <span className="material-symbols-outlined text-amber-600 text-[22px]">visibility_off</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-700 block">{data.inactiveListings} Listing</span>
                <span className="text-xs text-slate-500 mt-0.5 block">Draft, kedaluwarsa, atau ditangguhkan</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Perlu evaluasi</span>
                <Link to="/admin/properties" className="text-amber-700 font-bold hover:underline">Periksa →</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. KATEGORI 4: AKTIVITAS & MODERASI REAL-TIME ── */}
      {(activeCategoryTab === 'all' || activeCategoryTab === 'activity') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[19px]">history</span>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Arus Aktivitas Platform & Moderasi
                </h2>
                <p className="text-xs text-slate-500">
                  Rekam jejak pendaftaran, transaksi pembayaran, aktivasi paket, dan laporan terbaru.
                </p>
              </div>
            </div>

            {/* Filter Pill Aktivitas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-bold mr-1">Filter:</span>
              {[
                { key: 'all', label: 'Semua' },
                { key: 'payment', label: 'Pembayaran' },
                { key: 'subscription', label: 'Langganan' },
                { key: 'owner', label: 'Owner Baru' },
                { key: 'report', label: 'Laporan' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActivityFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activityFilter === f.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredActivity.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-[36px] text-slate-300 block mb-2">inbox</span>
                <p className="text-sm font-bold text-slate-600">Tidak ada aktivitas pada filter ini</p>
                <p className="text-xs text-slate-400 mt-0.5">Semua riwayat terbaru akan otomatis muncul di sini</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredActivity.map((item, idx) => {
                  const content = (
                    <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.tone} shadow-2xs`}>
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-slate-900 group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${item.badgeTone}`}>
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{item.sub}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-medium text-slate-400 block">{timeAgo(item.at)}</span>
                        {item.to && (
                          <span className="text-[11px] font-bold text-primary group-hover:underline flex items-center justify-end gap-0.5 mt-0.5">
                            <span>Periksa</span>
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <li key={idx}>
                      {item.to ? <Link to={item.to}>{content}</Link> : content}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
