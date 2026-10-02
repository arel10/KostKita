import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { DashboardReport, Property } from '../../types';

export const ReportPage: React.FC = () => {
  const [dashboardReport, setDashboardReport] = useState<DashboardReport | null>(null);
  const [occupancyData, setOccupancyData] = useState<Property[]>([]);
  const [revenuePayments, setRevenuePayments] = useState<any[]>([]);
  const [totalRevenueAmount, setTotalRevenueAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.set('from', fromDate);
      if (toDate) queryParams.set('to', toDate);

      const [dashRes, occRes, revRes] = await Promise.allSettled([
        api.get('/reports/dashboard'),
        api.get('/reports/occupancy'),
        api.get(`/reports/revenue?${queryParams.toString()}`),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
        setDashboardReport(dashRes.value.data.data);
      }
      if (occRes.status === 'fulfilled' && occRes.value.data?.data) {
        setOccupancyData(occRes.value.data.data);
      }
      if (revRes.status === 'fulfilled' && revRes.value.data?.data) {
        setRevenuePayments(revRes.value.data.data.payments || []);
        setTotalRevenueAmount(revRes.value.data.data.totalAmount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading && !dashboardReport) {
    return <LoadingSpinner label="Menyusun analisis keuangan & okupansi..." />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Laporan Keuangan & Okupansi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis arus kas masuk sewa kamar dan performa tingkat keterisian unit kost.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs text-slate-400 font-semibold pl-2">Filter:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 focus:outline-none"
          />
          <span className="text-xs text-slate-400">-</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 focus:outline-none"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
              title="Reset Filter"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Pemasukan Bulan Ini
          </span>
          <span className="text-2xl lg:text-3xl font-extrabold text-emerald-700 mt-1 block">
            {formatRupiah(dashboardReport?.revenueThisMonth || 0)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Akumulasi total: {formatRupiah(dashboardReport?.revenueTotal || 0)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Rata-rata Okupansi Keseluruhan
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900">
              {dashboardReport?.occupancyRate || 0}%
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {dashboardReport?.occupiedRooms} / {dashboardReport?.totalRooms} Kamar Terisi
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${dashboardReport?.occupancyRate || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Piutang Belum Terbayar
          </span>
          <span className="text-2xl lg:text-3xl font-extrabold text-amber-700 mt-1 block">
            {dashboardReport?.pendingPayments || 0} Tagihan
          </span>
          <span className="text-[11px] text-red-600 mt-1 block">
            {dashboardReport?.overduePayments || 0} tagihan telah melewati jatuh tempo
          </span>
        </div>
      </div>

      {/* Occupancy Breakdown by Property */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
          Performa Okupansi Per Properti Kost
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {occupancyData.map((p) => {
            const totalR = p._count?.rooms || 0;
            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{p.name}</span>
                    <span className="text-[11px] text-slate-500">{p.address}, {p.city}</span>
                  </div>
                  <Badge variant={p.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {p.status}
                  </Badge>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span>Kapasitas Bangunan:</span>
                  <span className="font-bold text-slate-900">{totalR} Unit Kamar</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Transactions Ledger */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Buku Kas Pembayaran Lunas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian seluruh transaksi uang sewa yang berhasil masuk kas.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-semibold block">Total Periode Ini:</span>
            <span className="text-sm font-extrabold text-emerald-700">
              {formatRupiah(totalRevenueAmount)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
              <tr>
                <th className="px-6 py-4">Tanggal Pembayaran</th>
                <th className="px-6 py-4">Penyewa & Kamar</th>
                <th className="px-6 py-4">Properti</th>
                <th className="px-6 py-4">Metode</th>
                <th className="px-6 py-4 text-right">Nominal Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenuePayments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-600">
                    {new Date(p.paymentDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 block">
                      {p.tenantStay?.tenant?.name || 'Penyewa'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Kamar {p.tenantStay?.room?.roomNumber || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {p.tenantStay?.room?.property?.name || '-'}
                  </td>
                  <td className="px-6 py-4 capitalize text-slate-600">
                    {p.paymentMethod.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-emerald-700 text-sm">
                    +{formatRupiah(p.amount)}
                  </td>
                </tr>
              ))}

              {revenuePayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada transaksi pembayaran lunas pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
