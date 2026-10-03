import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { DashboardReport, OccupancyPropertyReport, RevenueReportData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { PrintableReportTemplate } from '../../components/reports/PrintableReportTemplate';

export const ReportPage: React.FC = () => {
  const { user } = useAuth();
  const [dashboardReport, setDashboardReport] = useState<DashboardReport | null>(null);
  const [occupancyData, setOccupancyData] = useState<OccupancyPropertyReport[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Preset & custom date filters
  const [datePreset, setDatePreset] = useState<'this_month' | 'last_month' | 'this_year' | 'all' | 'custom'>('this_month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Other filters
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [searchLedgerQuery, setSearchLedgerQuery] = useState('');

  // Expanded property state for room details
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  // Set default dates on mount (this month)
  useEffect(() => {
    applyPreset('this_month');
  }, []);

  const applyPreset = (preset: 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(formatYMD(start));
      setToDate(formatYMD(end));
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(formatYMD(start));
      setToDate(formatYMD(end));
    } else if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setFromDate(formatYMD(start));
      setToDate(formatYMD(end));
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.set('from', fromDate);
      if (toDate) queryParams.set('to', toDate);
      if (selectedPropertyId !== 'all') queryParams.set('propertyId', selectedPropertyId);
      if (selectedPaymentStatus !== 'all') queryParams.set('status', selectedPaymentStatus);
      if (selectedPaymentMethod !== 'all') queryParams.set('paymentMethod', selectedPaymentMethod);
      queryParams.set('perPage', 'all');

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
        setRevenueData(revRes.value.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, selectedPropertyId, selectedPaymentStatus, selectedPaymentMethod]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDateSafe = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Filtered Ledger transactions
  const filteredLedger = useMemo(() => {
    if (!revenueData?.payments) return [];
    const q = searchLedgerQuery.toLowerCase().trim();
    if (!q) return revenueData.payments;

    return revenueData.payments.filter((p: any) => {
      const tenantName = (p.tenantStay?.tenant?.name || '').toLowerCase();
      const roomNum = (p.tenantStay?.room?.roomNumber || '').toLowerCase();
      const propName = (p.tenantStay?.room?.property?.name || '').toLowerCase();
      const method = (p.paymentMethod || '').toLowerCase();
      const notes = (p.notes || '').toLowerCase();

      return (
        tenantName.includes(q) ||
        roomNum.includes(q) ||
        propName.includes(q) ||
        method.includes(q) ||
        notes.includes(q)
      );
    });
  }, [revenueData?.payments, searchLedgerQuery]);

  // Aggregate totals of filtered transactions
  const filteredTotalAmount = useMemo(() => {
    return filteredLedger.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [filteredLedger]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredLedger || filteredLedger.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor.');
      return;
    }

    const headers = [
      'No',
      'Tanggal Pembayaran',
      'Nama Penyewa',
      'No WhatsApp',
      'Kamar',
      'Properti Kost',
      'Awal Periode',
      'Akhir Periode',
      'Metode Pembayaran',
      'Status Pembayaran',
      'Nominal (Rp)',
      'Catatan',
    ];

    const rows = filteredLedger.map((p: any, idx: number) => [
      idx + 1,
      formatDateSafe(p.paymentDate),
      `"${p.tenantStay?.tenant?.name || '-'}"`,
      `"${p.tenantStay?.tenant?.whatsapp || '-'}"`,
      `"Kamar ${p.tenantStay?.room?.roomNumber || '-'}"`,
      `"${p.tenantStay?.room?.property?.name || '-'}"`,
      formatDateSafe(p.periodStart),
      formatDateSafe(p.periodEnd),
      p.paymentMethod === 'bank_transfer'
        ? 'Transfer Bank'
        : p.paymentMethod === 'cash'
        ? 'Tunai'
        : 'QRIS / Lainnya',
      p.status === 'paid' ? 'Lunas' : p.status === 'pending' ? 'Pending' : 'Overdue',
      p.amount,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Keuangan_KostKita_${fromDate || 'semua'}_sd_${toDate || 'semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && !dashboardReport) {
    return <LoadingSpinner label="Menyusun analisis keuangan & okupansi real-time..." />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 print:p-0 print:space-y-0">
      {/* ── Advanced Print-only CSS ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Sembunyikan semua elemen UI layar saat pencetakan */
          body * {
            visibility: hidden !important;
          }
          /* Jadikan hanya #printable-report-area dan seluruh isinya yang dicetak */
          #printable-report-area,
          #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, nav, aside, header, footer {
            display: none !important;
          }
        }
        .print-only-report {
          display: none;
        }
      `}</style>

      {/* ── PRINT-ONLY CONTAINER (Tersembunyi di web, aktif saat dicetak / diexport PDF) ── */}
      <div id="printable-report-area" className="print-only-report">
        <PrintableReportTemplate
          user={user}
          dashboardReport={dashboardReport}
          occupancyData={occupancyData}
          revenueData={revenueData}
          filteredLedger={filteredLedger}
          filteredTotalAmount={filteredTotalAmount}
          fromDate={fromDate}
          toDate={toDate}
          selectedPropertyId={selectedPropertyId}
          selectedPaymentStatus={selectedPaymentStatus}
          selectedPaymentMethod={selectedPaymentMethod}
        />
      </div>

      {/* Page Header (No-print controls) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Laporan Keuangan & Okupansi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis arus kas masuk sewa kamar, estimasi potensi pendapatan, dan performa tingkat keterisian unit kost.
          </p>
        </div>

        {/* Action Buttons: Export & Print */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
            title="Download data transaksi dalam format CSV / Excel"
          >
            <span className="material-symbols-outlined text-[17px] text-emerald-600">table_view</span>
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Buka Pratinjau Kertas A4 & Cetak PDF Resmi"
          >
            <span className="material-symbols-outlined text-[17px] text-amber-300">visibility</span>
            <span>Pratinjau PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            title="Cetak atau Simpan Langsung sebagai PDF"
          >
            <span className="material-symbols-outlined text-[17px]">print</span>
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1">Periode:</span>
            <button
              type="button"
              onClick={() => applyPreset('this_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                datePreset === 'this_month'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                datePreset === 'last_month'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                datePreset === 'this_year'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tahun Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold">Kustom:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setDatePreset('custom');
                setFromDate(e.target.value);
              }}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 focus:outline-none bg-slate-50 cursor-pointer"
            />
            <span className="text-xs text-slate-400">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setDatePreset('custom');
                setToDate(e.target.value);
              }}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 focus:outline-none bg-slate-50 cursor-pointer"
            />
          </div>
        </div>

        {/* Secondary Dropdown Filters */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Properti Kost
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Properti Kost</option>
              {occupancyData.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.totalRooms} Kamar)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Status Pembayaran
            </label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status (Lunas, Pending, Overdue)</option>
              <option value="paid">Lunas (Paid)</option>
              <option value="pending">Menunggu Konfirmasi (Pending)</option>
              <option value="overdue">Jatuh Tempo (Overdue)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Metode Pembayaran
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Metode Pembayaran</option>
              <option value="bank_transfer">Transfer Bank</option>
              <option value="cash">Tunai (Cash)</option>
              <option value="other">QRIS / E-Wallet / Lainnya</option>
            </select>
          </div>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Penerimaan Kas Periode Ini
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
              {formatRupiah(revenueData?.totalPaidAmount ?? dashboardReport?.revenueThisMonth ?? 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Total {revenueData?.totalPaidCount ?? 0} transaksi lunas
            </span>
            {dashboardReport?.momGrowthPercent !== undefined && dashboardReport.momGrowthPercent !== 0 && (
              <span
                className={`font-bold px-1.5 py-0.5 rounded ${
                  dashboardReport.momGrowthPercent > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {dashboardReport.momGrowthPercent > 0 ? '+' : ''}
                {dashboardReport.momGrowthPercent}% MoM
              </span>
            )}
          </div>
        </div>

        {/* Potential Revenue Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Potensi Pendapatan Bulanan
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
              {formatRupiah(dashboardReport?.potentialMonthlyRevenue || 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Kapasitas penuh 100%</span>
            <span className="font-semibold text-slate-700">
              {dashboardReport?.totalRooms || 0} Total Kamar
            </span>
          </div>
        </div>

        {/* Overall Occupancy Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tingkat Okupansi Keseluruhan
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {dashboardReport?.occupancyRate || 0}%
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {dashboardReport?.occupiedRooms || 0} / {dashboardReport?.totalRooms || 0} Terisi
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${dashboardReport?.occupancyRate || 0}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
              <span>Kosong: {dashboardReport?.availableRooms || 0}</span>
              <span>Penghuni: {dashboardReport?.activeTenantsCount || dashboardReport?.occupiedRooms || 0}</span>
            </div>
          </div>
        </div>

        {/* Outstanding Receivables Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Piutang Belum Terbayar
            </span>
            <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
              {dashboardReport?.pendingPayments || 0} Tagihan
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px]">
            {dashboardReport?.overduePayments ? (
              <span className="text-red-600 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span>{dashboardReport.overduePayments} tagihan telah jatuh tempo</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>Tidak ada tunggakan jatuh tempo</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Payment Method Distribution Breakdown */}
      {revenueData?.breakdownByMethod && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Distribusi Metode Pembayaran
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian cara pembayaran yang digunakan penghuni kost pada periode terpilih.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Transfer Bank */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-900 block">Transfer Bank</span>
                  <span className="text-[11px] text-blue-700">
                    {revenueData.breakdownByMethod.bank_transfer?.count || 0} transaksi
                  </span>
                </div>
              </div>
              <span className="text-sm font-extrabold text-blue-900">
                {formatRupiah(revenueData.breakdownByMethod.bank_transfer?.total || 0)}
              </span>
            </div>

            {/* Tunai (Cash) */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">Tunai (Cash)</span>
                  <span className="text-[11px] text-emerald-700">
                    {revenueData.breakdownByMethod.cash?.count || 0} transaksi
                  </span>
                </div>
              </div>
              <span className="text-sm font-extrabold text-emerald-900">
                {formatRupiah(revenueData.breakdownByMethod.cash?.total || 0)}
              </span>
            </div>

            {/* QRIS / Lainnya */}
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-purple-900 block">QRIS & Lainnya</span>
                  <span className="text-[11px] text-purple-700">
                    {revenueData.breakdownByMethod.other?.count || 0} transaksi
                  </span>
                </div>
              </div>
              <span className="text-sm font-extrabold text-purple-900">
                {formatRupiah(revenueData.breakdownByMethod.other?.total || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Occupancy Breakdown by Property */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Performa Okupansi & Kapasitas Kost
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian tingkat keterisian, kapasitas kamar, dan sewa aktif untuk masing-masing lokasi kost.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold self-start sm:self-auto">
            {occupancyData.length} Properti Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {occupancyData.map((p) => {
            const isExpanded = expandedPropertyId === p.id;

            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{p.name}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Kost {p.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {p.address}, {p.city}
                      </span>
                    </div>
                    <Badge variant={p.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {p.status === 'active' ? 'Aktif' : p.status}
                    </Badge>
                  </div>

                  {/* Occupancy Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Tingkat Okupansi</span>
                      <span className="font-extrabold text-slate-900">{p.occupancyRate}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${p.occupancyRate}%` }}
                        title={`${p.occupiedRooms} Kamar Terisi`}
                      ></div>
                    </div>
                  </div>

                  {/* Room Status Chips */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Kamar</span>
                      <span className="text-sm font-extrabold text-slate-900 block mt-0.5">{p.totalRooms}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">Terisi</span>
                      <span className="text-sm font-extrabold text-emerald-800 block mt-0.5">{p.occupiedRooms}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200">
                      <span className="text-[10px] text-slate-600 font-bold uppercase block">Kosong</span>
                      <span className="text-sm font-extrabold text-slate-700 block mt-0.5">{p.availableRooms}</span>
                    </div>
                  </div>

                  {/* Revenue Summary */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sewa Aktif Berjalan:</span>
                      <span className="font-bold text-emerald-700">
                        {formatRupiah(p.monthlyActiveRent)}/bln
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Potensi Maksimal:</span>
                      <span className="font-semibold text-slate-600">
                        {formatRupiah(p.monthlyPotential)}/bln
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle Room Details */}
                {p.rooms && p.rooms.length > 0 && (
                  <div className="mt-4 pt-2 no-print">
                    <button
                      type="button"
                      onClick={() => setExpandedPropertyId(isExpanded ? null : p.id)}
                      className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Tutup Rincian Kamar' : `Lihat Semua Kamar (${p.rooms.length})`}</span>
                      <span className="material-symbols-outlined text-[16px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                            <tr>
                              <th className="px-3 py-2">No. Kamar</th>
                              <th className="px-3 py-2">Tipe</th>
                              <th className="px-3 py-2">Tarif</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Penghuni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {p.rooms.map((r) => (
                              <tr key={r.id}>
                                <td className="px-3 py-2 font-bold text-slate-800">
                                  Kamar {r.roomNumber}
                                </td>
                                <td className="px-3 py-2 text-slate-600 capitalize">
                                  {r.type}
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-800">
                                  {formatRupiah(r.price)}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      r.status === 'occupied'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : r.status === 'available'
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {r.status === 'occupied' ? 'Terisi' : r.status === 'available' ? 'Kosong' : 'Perbaikan'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-700 font-medium">
                                  {r.activeStay?.tenantName || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Transactions Ledger (Buku Kas Penerimaan) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Buku Kas Rincian Transaksi Pembayaran
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar seluruh transaksi penerimaan sewa yang tercatat dalam periode filter.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search within ledger */}
            <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl gap-2 no-print">
              <span className="material-symbols-outlined text-slate-400 text-[16px]">search</span>
              <input
                type="text"
                value={searchLedgerQuery}
                onChange={(e) => setSearchLedgerQuery(e.target.value)}
                placeholder="Cari transaksi..."
                className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-36 sm:w-48"
              />
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Transaksi Sesuai Filter:</span>
              <span className="text-base font-extrabold text-emerald-700">
                {formatRupiah(filteredTotalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
              <tr>
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Tanggal Pembayaran</th>
                <th className="px-6 py-4">Penyewa & Kontak</th>
                <th className="px-6 py-4">Kamar & Properti</th>
                <th className="px-6 py-4">Periode Sewa</th>
                <th className="px-6 py-4">Metode Bayar</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.map((p: any, idx: number) => {
                const tenant = p.tenantStay?.tenant;
                const room = p.tenantStay?.room;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-700">
                      {formatDateSafe(p.paymentDate)}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 block">
                        {tenant?.name || 'Penyewa'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {tenant?.whatsapp || '-'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 block">
                        Kamar {room?.roomNumber || '-'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {room?.property?.name || 'Properti Kost'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      <span className="block font-medium">
                        {formatDateSafe(p.periodStart)} s/d {formatDateSafe(p.periodEnd)}
                      </span>
                    </td>

                    <td className="px-6 py-4 capitalize text-slate-600">
                      {p.paymentMethod === 'bank_transfer'
                        ? 'Transfer Bank'
                        : p.paymentMethod === 'cash'
                        ? 'Tunai (Cash)'
                        : 'QRIS / Lainnya'}
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          p.status === 'paid'
                            ? 'success'
                            : p.status === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                        dot
                      >
                        {p.status === 'paid' ? 'Lunas' : p.status === 'pending' ? 'Pending' : 'Overdue'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-sm">
                      {formatRupiah(p.amount)}
                      {p.notes && (
                        <span className="block text-[10px] text-slate-400 font-normal italic">
                          {p.notes}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <EmptyState
                      icon="receipt_long"
                      title="Tidak Ada Data Transaksi"
                      description="Tidak ada catatan pembayaran yang cocok dengan filter tanggal atau kata kunci Anda."
                    />
                  </td>
                </tr>
              )}
            </tbody>
            {filteredLedger.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-slate-700 uppercase">
                    Total Keseluruhan Penerimaan:
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-800 text-sm font-extrabold">
                    {formatRupiah(filteredTotalAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── PRINT PREVIEW MODAL ── */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-slate-100 rounded-3xl shadow-2xl border border-slate-700/30 w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
            {/* Modal Top Bar */}
            <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pratinjau Dokumen Laporan Resmi (PDF / Cetak)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Format standar A4 dengan kop resmi, ringkasan eksekutif, buku kas, dan pengesahan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">table_view</span>
                  <span>Ekspor CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">print</span>
                  <span>Cetak / Simpan PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors ml-1 cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Paper Canvas with Drop Shadow */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-800/10 flex justify-center">
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-[210mm] my-2 transition-all">
                <PrintableReportTemplate
                  user={user}
                  dashboardReport={dashboardReport}
                  occupancyData={occupancyData}
                  revenueData={revenueData}
                  filteredLedger={filteredLedger}
                  filteredTotalAmount={filteredTotalAmount}
                  fromDate={fromDate}
                  toDate={toDate}
                  selectedPropertyId={selectedPropertyId}
                  selectedPaymentStatus={selectedPaymentStatus}
                  selectedPaymentMethod={selectedPaymentMethod}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
