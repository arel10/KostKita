import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { DashboardReport, Property, TenantPayment } from '../../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const context = useOutletContext<{ properties: Property[]; refreshGlobal: () => void }>();
  const { subscription, usage, isPropertyBlocked, isTenantBlocked, openQuotaModal } = useSubscription();

  const [report, setReport] = useState<DashboardReport | null>(null);
  const [recentPayments, setRecentPayments] = useState<TenantPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const [reportRes, paymentsRes] = await Promise.allSettled([
        api.get('/reports/dashboard'),
        api.get('/payments?perPage=5'),
      ]);

      if (reportRes.status === 'fulfilled' && reportRes.value.data?.data) {
        setReport(reportRes.value.data.data);
      }
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data?.data) {
        setRecentPayments(paymentsRes.value.data.data);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const properties = context?.properties || [];

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading && !report) {
    return <LoadingSpinner label="Menyiapkan data operasional kost Anda..." />;
  }

  const sub = report?.subscription;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Greeting & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-primary bg-primary-fixed/40 px-2.5 py-0.5 rounded-full">
              Pusat Kendali Juragan
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Selamat Datang, {user?.name || 'Juragan'} 👋
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Berikut ringkasan performa okupansi dan keuangan properti kost Anda hari ini.
          </p>
        </div>

        {/* Quick Actions (Quota Aware) */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {isPropertyBlocked ? (
            <button
              type="button"
              onClick={() => openQuotaModal('property')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Batas kuota properti tercapai untuk paket Anda. Klik untuk upgrade ke Pro."
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
              <span>+ Properti ({usage?.properties.current}/{usage?.properties.limit})</span>
            </button>
          ) : (
            <Link
              to="/properties/new"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              <span>+ Properti Baru</span>
            </Link>
          )}

          {isTenantBlocked ? (
            <button
              type="button"
              onClick={() => openQuotaModal('tenant')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Batas penyewa aktif tercapai untuk paket Anda. Klik untuk upgrade."
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
              <span>+ Penghuni ({usage?.tenants.current}/{usage?.tenants.limit})</span>
            </button>
          ) : (
            <Link
              to="/tenants"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200/80 shadow-sm transition-all whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">person_add</span>
              <span>+ Penghuni</span>
            </Link>
          )}

          <Link
            to="/payments"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">payments</span>
            <span>Catat Bayar</span>
          </Link>
        </div>
      </div>

      {/* Subscription Alert Card with Benefit Quota Overview */}
      {sub && (
        <div className="bg-gradient-to-r from-emerald-900 via-primary-container to-teal-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 text-emerald-300">
              <span className="material-symbols-outlined text-[28px]">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-300">
                  Langganan Aktif
                </span>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  Paket {sub.planName}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold mt-0.5">
                Masa Aktif: Tersisa {sub.daysLeft} Hari Lagi
              </h3>

              {/* Benefit Quota Pill Badges */}
              {usage && (
                <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
                  <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold ${
                    isPropertyBlocked ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-white/15 text-white'
                  }`}>
                    <span className="material-symbols-outlined text-[15px]">
                      {isPropertyBlocked ? 'lock' : 'apartment'}
                    </span>
                    <span>Properti: {usage.properties.current}/{usage.properties.limit ?? '∞'}</span>
                    {isPropertyBlocked && <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded font-bold uppercase">Penuh</span>}
                  </div>

                  <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold ${
                    usage.rooms.allowed ? 'bg-white/15 text-white' : 'bg-amber-400 text-slate-900 font-bold'
                  }`}>
                    <span className="material-symbols-outlined text-[15px]">meeting_room</span>
                    <span>Kamar: {usage.rooms.current}/{usage.rooms.limit ?? '∞'}</span>
                  </div>

                  <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold ${
                    usage.tenants.allowed ? 'bg-white/15 text-white' : 'bg-amber-400 text-slate-900 font-bold'
                  }`}>
                    <span className="material-symbols-outlined text-[15px]">group</span>
                    <span>Penghuni: {usage.tenants.current}/{usage.tenants.limit ?? '∞'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <Link
              to="/subscription"
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-emerald-50 text-primary text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Upgrade / Perpanjang Paket</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Properti Kost"
          value={report?.totalProperties ?? properties.length}
          unit="Bangunan"
          subtitle="Properti aktif terdaftar"
          icon="apartment"
          color="primary"
        />
        <StatCard
          title="Tingkat Okupansi"
          value={`${report?.occupancyRate ?? 0}%`}
          unit={`${report?.occupiedRooms ?? 0}/${report?.totalRooms ?? 0} Kamar`}
          subtitle="Kamar terisi saat ini"
          progress={report?.occupancyRate ?? 0}
          icon="insights"
          color="emerald"
        />
        <StatCard
          title="Pemasukan Bulan Ini"
          value={formatRupiah(report?.revenueThisMonth ?? 0)}
          subtitle={`Total akumulasi: ${formatRupiah(report?.revenueTotal ?? 0)}`}
          icon="account_balance_wallet"
          color="blue"
        />
        <StatCard
          title="Tagihan Belum Bayar"
          value={report?.pendingPayments ?? 0}
          unit="Penyewa"
          subtitle={`${report?.overduePayments ?? 0} jatuh tempo (overdue)`}
          icon="pending_actions"
          color="amber"
        />
      </div>

      {/* Two Column Layout: Properti Terdaftar & Transaksi Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Properti Portofolio (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Daftar Properti Kost</h2>
              <p className="text-xs text-slate-500">Portofolio bangunan dan status listing publik</p>
            </div>
            <Link
              to="/properties"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          <div className="space-y-3">
            {properties.slice(0, 3).map((p) => {
              const primaryPhoto =
                p.photos?.find((ph) => ph.isPrimary)?.url ||
                p.photos?.[0]?.url ||
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500';
              const totalRooms = p.rooms?.length || p._count?.rooms || 0;
              const occupiedRooms = p.rooms?.filter((r) => r.status === 'occupied').length || 0;

              return (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  <img
                    src={primaryPhoto}
                    alt={p.name}
                    className="w-full sm:w-28 h-36 sm:h-24 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge
                        variant={p.status === 'active' ? 'success' : 'neutral'}
                        size="sm"
                        dot
                      >
                        {p.status === 'active' ? 'Tayang Publik' : p.status}
                      </Badge>
                      <span className="text-xs text-slate-400 capitalize">Kost {p.type}</span>
                    </div>
                    <Link
                      to={`/properties/${p.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-primary transition-colors truncate block"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      📍 {p.address}, {p.city}
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-slate-600 flex-wrap">
                      <span>🚪 {totalRooms} Kamar Total</span>
                      <span>👥 {occupiedRooms} Terisi</span>
                      <span className="font-semibold text-primary">
                        Mulai {formatRupiah(p.priceStart || 0)}/bln
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex sm:flex-col gap-2 w-full sm:w-auto">
                    <Link
                      to={`/properties/${p.id}`}
                      className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg text-center border border-slate-200/60"
                    >
                      Detail & Kamar
                    </Link>
                  </div>
                </div>
              );
            })}

            {properties.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">apartment</span>
                <p className="text-xs font-semibold text-slate-600">Belum ada properti kost terdaftar</p>
                <Link
                  to="/properties/new"
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
                >
                  + Daftarkan Kost Pertama Anda
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Catatan Pembayaran Terbaru (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Pembayaran Sewa</h2>
              <p className="text-xs text-slate-500">Aktivitas pelunasan & tagihan</p>
            </div>
            <Link
              to="/payments"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Semua Tagihan</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 divide-y divide-slate-100">
            {recentPayments.map((pay) => {
              const tenantName = pay.tenantStay?.tenant?.name || 'Penyewa';
              const roomNumber = pay.tenantStay?.room?.roomNumber || '-';
              const tenantPhone = pay.tenantStay?.tenant?.phone || (pay.tenantStay?.tenant as any)?.whatsapp;

              return (
                <div key={pay.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 truncate">{tenantName}</span>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Kamar {roomNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(pay.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {pay.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-slate-900">
                      {formatRupiah(pay.amount)}
                    </span>
                    <Badge
                      variant={
                        pay.status === 'paid'
                          ? 'success'
                          : pay.status === 'pending'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {pay.status === 'paid' ? 'Lunas' : pay.status === 'pending' ? 'Pending' : 'Overdue'}
                    </Badge>

                    {pay.status !== 'paid' && tenantPhone && (
                      <a
                        href={`https://wa.me/${tenantPhone.replace(/\D/g, '')}?text=Halo%20${encodeURIComponent(tenantName)},%20ini%20pengingat%20tagihan%20sewa%20kamar%20${encodeURIComponent(roomNumber)}%20sebesar%20${encodeURIComponent(formatRupiah(pay.amount))}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-semibold"
                        title="Kirim pengingat WhatsApp"
                      >
                        <span className="material-symbols-outlined text-[12px]">send</span>
                        Ingatkan WA
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {recentPayments.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada transaksi pembayaran sewa tercatat.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
