import React from 'react';
import { User, DashboardReport, OccupancyPropertyReport, RevenueReportData } from '../../types';

interface PrintableReportTemplateProps {
  user: User | null;
  dashboardReport: DashboardReport | null;
  occupancyData: OccupancyPropertyReport[];
  revenueData: RevenueReportData | null;
  filteredLedger: any[];
  filteredTotalAmount: number;
  fromDate: string;
  toDate: string;
  selectedPropertyId: string;
  selectedPaymentStatus: string;
  selectedPaymentMethod: string;
  documentNo?: string;
  printedAt?: Date;
}

export const PrintableReportTemplate: React.FC<PrintableReportTemplateProps> = ({
  user,
  dashboardReport,
  occupancyData,
  revenueData,
  filteredLedger,
  filteredTotalAmount,
  fromDate,
  toDate,
  selectedPropertyId,
  selectedPaymentStatus,
  selectedPaymentMethod,
  documentNo,
  printedAt = new Date(),
}) => {
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

  const formatDateTimeSafe = (dateVal: Date) => {
    return dateVal.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ' pukul ' + dateVal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  // Selected property name label
  const selectedPropertyName = React.useMemo(() => {
    if (selectedPropertyId === 'all') return 'Semua Properti Kost';
    const found = occupancyData.find((p) => p.id === selectedPropertyId);
    return found ? found.name : 'Semua Properti Kost';
  }, [selectedPropertyId, occupancyData]);

  // Status label
  const selectedStatusLabel = React.useMemo(() => {
    if (selectedPaymentStatus === 'paid') return 'Hanya Lunas (Paid)';
    if (selectedPaymentStatus === 'pending') return 'Hanya Pending';
    if (selectedPaymentStatus === 'overdue') return 'Hanya Jatuh Tempo (Overdue)';
    return 'Semua Status (Lunas, Pending, Overdue)';
  }, [selectedPaymentStatus]);

  // Method label
  const selectedMethodLabel = React.useMemo(() => {
    if (selectedPaymentMethod === 'bank_transfer') return 'Transfer Bank';
    if (selectedPaymentMethod === 'cash') return 'Tunai (Cash)';
    if (selectedPaymentMethod === 'other') return 'QRIS / E-Wallet';
    return 'Semua Metode Pembayaran';
  }, [selectedPaymentMethod]);

  const docCode = documentNo || `KK-REP-${printedAt.getFullYear()}${String(printedAt.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return (
    <div className="printable-report-container bg-white text-slate-800 font-sans p-6 sm:p-10 max-w-[210mm] mx-auto leading-normal">
      {/* ── 1. KOP SURAT RESMI (OFFICIAL LETTERHEAD) ── */}
      <div className="border-b-2 border-slate-900 pb-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/logo.png"
                alt="KostKita Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">KostKita</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Official Report
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Sistem Manajemen Properti & Kos-Kosan Terpadu
              </p>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                <span>Pengelola: <strong className="text-slate-800">{user?.name || 'Pemilik Kost'}</strong></span>
                <span>•</span>
                <span>Kontak: {user?.email || '-'} {user?.phone ? `(${user.phone})` : ''}</span>
              </div>
            </div>
          </div>

          {/* Document Metadata Box */}
          <div className="text-right shrink-0">
            <div className="inline-block bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Nomor Dokumen
              </span>
              <span className="text-xs font-mono font-extrabold text-slate-900 block mt-0.5">
                {docCode}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">
                Dicetak: {formatDateTimeSafe(printedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Report Title & Scope */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
              Laporan Akuntansi Keuangan & Okupansi Properti
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Rekapitulasi performa arus kas sewa, tingkat hunian kamar, dan rincian transaksi buku kas.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/80 shrink-0">
            <span className="font-semibold text-slate-500">Periode:</span>
            <strong className="text-slate-900">
              {fromDate ? formatDateSafe(fromDate) : 'Awal Pembukuan'} s/d {toDate ? formatDateSafe(toDate) : 'Sekarang'}
            </strong>
          </div>
        </div>

        {/* Filter Summary Tags */}
        <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-slate-600">
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Properti: <strong className="text-slate-800">{selectedPropertyName}</strong>
          </span>
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Filter Status: <strong className="text-slate-800">{selectedStatusLabel}</strong>
          </span>
          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Filter Metode: <strong className="text-slate-800">{selectedMethodLabel}</strong>
          </span>
        </div>
      </div>

      {/* ── 2. EXECUTIVE SUMMARY METRICS (4 CARDS) ── */}
      <div className="mb-6 break-inside-avoid">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          1. Ringkasan Kinerja Keuangan & Hunian
        </h3>

        <div className="grid grid-cols-4 gap-3">
          {/* Card 1: Penerimaan Kas */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
              Penerimaan Kas (Lunas)
            </span>
            <span className="text-base font-black text-emerald-900 mt-1 block">
              {formatRupiah(revenueData?.totalPaidAmount ?? dashboardReport?.revenueThisMonth ?? 0)}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-1">
              {revenueData?.totalPaidCount ?? 0} transaksi berhasil
            </span>
          </div>

          {/* Card 2: Potensi Pendapatan */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-600 uppercase block">
              Potensi Pendapatan
            </span>
            <span className="text-base font-black text-slate-900 mt-1 block">
              {formatRupiah(dashboardReport?.potentialMonthlyRevenue || 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Kapasitas 100% per bulan
            </span>
          </div>

          {/* Card 3: Tingkat Okupansi */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">
              Tingkat Okupansi
            </span>
            <span className="text-base font-black text-blue-900 mt-1 block">
              {dashboardReport?.occupancyRate || 0}%
            </span>
            <span className="text-[10px] text-blue-700 block mt-1">
              {dashboardReport?.occupiedRooms || 0} terisi / {dashboardReport?.availableRooms || 0} kosong
            </span>
          </div>

          {/* Card 4: Piutang & Jatuh Tempo */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">
              Piutang Belum Bayar
            </span>
            <span className="text-base font-black text-amber-900 mt-1 block">
              {dashboardReport?.pendingPayments || 0} Tagihan
            </span>
            <span className="text-[10px] text-amber-700 block mt-1">
              {dashboardReport?.overduePayments || 0} tagihan jatuh tempo
            </span>
          </div>
        </div>

        {/* Payment Methods Distribution Mini-Table */}
        {revenueData?.breakdownByMethod && (
          <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 text-[11px] uppercase">
              Rincian Metode Pembayaran:
            </span>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-500 text-[11px]">Transfer Bank: </span>
                <strong className="text-slate-900">
                  {formatRupiah(revenueData.breakdownByMethod.bank_transfer?.total || 0)}
                </strong>{' '}
                <span className="text-slate-400 text-[10px]">
                  ({revenueData.breakdownByMethod.bank_transfer?.count || 0}x)
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Tunai (Cash): </span>
                <strong className="text-slate-900">
                  {formatRupiah(revenueData.breakdownByMethod.cash?.total || 0)}
                </strong>{' '}
                <span className="text-slate-400 text-[10px]">
                  ({revenueData.breakdownByMethod.cash?.count || 0}x)
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">QRIS / Lainnya: </span>
                <strong className="text-slate-900">
                  {formatRupiah(revenueData.breakdownByMethod.other?.total || 0)}
                </strong>{' '}
                <span className="text-slate-400 text-[10px]">
                  ({revenueData.breakdownByMethod.other?.count || 0}x)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. PROPERTY OCCUPANCY BREAKDOWN TABLE ── */}
      {occupancyData.length > 0 && (
        <div className="mb-6 break-inside-avoid">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            2. Performa Okupansi per Lokasi Kost
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Nama Properti Kost</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3 text-center">Total Kamar</th>
                  <th className="py-2.5 px-3 text-center">Terisi</th>
                  <th className="py-2.5 px-3 text-center">Kosong</th>
                  <th className="py-2.5 px-3 text-center">Okupansi</th>
                  <th className="py-2.5 px-3 text-right">Sewa Aktif/Bulan</th>
                  <th className="py-2.5 px-3 text-right">Potensi/Bulan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {occupancyData.map((p, idx) => (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <strong className="text-slate-900 block">{p.name}</strong>
                      <span className="text-[10px] text-slate-500">{p.city}</span>
                    </td>
                    <td className="py-2 px-3 capitalize text-slate-600">Kost {p.type}</td>
                    <td className="py-2 px-3 text-center font-semibold text-slate-800">{p.totalRooms}</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-700">{p.occupiedRooms}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{p.availableRooms}</td>
                    <td className="py-2 px-3 text-center font-black text-slate-900">{p.occupancyRate}%</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-800">
                      {formatRupiah(p.monthlyActiveRent)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {formatRupiah(p.monthlyPotential)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. TRANSACTION LEDGER TABLE (BUKU KAS) ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            3. Rincian Buku Kas Transaksi Pembayaran ({filteredLedger.length} Transaksi)
          </h3>
          <span className="text-xs text-slate-600 font-bold">
            Total Sesuai Filter: <span className="text-emerald-800">{formatRupiah(filteredTotalAmount)}</span>
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Penyewa & WhatsApp</th>
                <th className="py-2.5 px-3">Kamar & Properti</th>
                <th className="py-2.5 px-3">Periode Sewa</th>
                <th className="py-2.5 px-3">Metode</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredLedger.map((p: any, idx: number) => {
                const tenant = p.tenantStay?.tenant;
                const room = p.tenantStay?.room;

                return (
                  <tr key={p.id} className={`break-inside-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {formatDateSafe(p.paymentDate)}
                    </td>
                    <td className="py-2 px-3">
                      <strong className="text-slate-900 block">{tenant?.name || '-'}</strong>
                      <span className="text-[10px] text-slate-400">{tenant?.whatsapp || '-'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-800 block">Kamar {room?.roomNumber || '-'}</span>
                      <span className="text-[10px] text-slate-500">{room?.property?.name || '-'}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-[10px]">
                      {formatDateSafe(p.periodStart)} s/d {formatDateSafe(p.periodEnd)}
                    </td>
                    <td className="py-2 px-3 text-slate-700 text-[10px] capitalize">
                      {p.paymentMethod === 'bank_transfer'
                        ? 'Transfer Bank'
                        : p.paymentMethod === 'cash'
                        ? 'Tunai'
                        : 'QRIS / Lainnya'}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          p.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : p.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {p.status === 'paid' ? 'Lunas' : p.status === 'pending' ? 'Pending' : 'Overdue'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatRupiah(p.amount)}
                    </td>
                  </tr>
                );
              })}

              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Tidak ada catatan transaksi dalam filter ini.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredLedger.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 text-slate-800 uppercase tracking-wider text-right">
                    Total Keseluruhan Penerimaan:
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-900 font-black text-sm">
                    {formatRupiah(filteredTotalAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── 5. LEMBAR PENGESAHAN & TANDA TANGAN (SIGNATURE BLOCK) ── */}
      <div className="mt-8 pt-6 border-t border-slate-200 break-inside-avoid">
        <div className="flex items-start justify-between text-xs text-slate-700">
          {/* Note & QR/Barcode validation */}
          <div className="max-w-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Catatan & Pernyataan
            </span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Laporan ini dicetak secara otomatis melalui platform <strong>KostKita</strong>. Data transaksi yang tercantum sah dan sesuai dengan pencatatan digital operasional pada saat dokumen ini diterbitkan.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
              <span>VERIFIED DIGITAL DOCUMENT #{docCode}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex items-center gap-14">
            <div className="text-center w-36">
              <span className="text-[10px] text-slate-500 block mb-12">
                Dibuat & Diverifikasi Oleh,
              </span>
              <div className="border-b border-slate-400 mb-1 w-full"></div>
              <strong className="text-slate-900 text-xs block">Bagian Keuangan / Admin</strong>
              <span className="text-[10px] text-slate-400">Pengelola Operasional</span>
            </div>

            <div className="text-center w-36">
              <span className="text-[10px] text-slate-500 block mb-12">
                Disetujui Oleh,
              </span>
              <div className="border-b border-slate-400 mb-1 w-full"></div>
              <strong className="text-slate-900 text-xs block">{user?.name || 'Pemilik Kost'}</strong>
              <span className="text-[10px] text-slate-400">Pemilik (Owner)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Watermark */}
      <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
        <span>KostKita Cloud Management • Dokumen Resmi Pengelolaan Kost</span>
        <span>Halaman 1 / Rekapitulasi Pembukuan</span>
      </div>
    </div>
  );
};
