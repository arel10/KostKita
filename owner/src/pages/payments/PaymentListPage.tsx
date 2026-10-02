import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { TenantPayment, Tenant } from '../../types';

export const PaymentListPage: React.FC = () => {
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal: Catat Pembayaran
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStayId, setSelectedStayId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodStart, setPeriodStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [periodEnd, setPeriodEnd] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'other'>('bank_transfer');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'overdue'>('paid');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete payment
  const [deleteTarget, setDeleteTarget] = useState<TenantPayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const [payRes, tenantsRes] = await Promise.allSettled([
        api.get('/payments'),
        api.get('/tenants'),
      ]);

      if (payRes.status === 'fulfilled' && payRes.value.data?.data) {
        setPayments(payRes.value.data.data);
      }
      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.data?.data) {
        setTenants(tenantsRes.value.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch payments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const activeStays = tenants
    .flatMap((t) =>
      (t.stays || [])
        .filter((s) => s.status === 'active')
        .map((s) => ({
          stayId: s.id,
          tenantName: t.name,
          phone: t.phone,
          roomNumber: s.room?.roomNumber,
          propertyName: s.room?.property?.name,
          rentAmount: s.rentAmount,
        }))
    );

  const handleOpenModal = () => {
    const defaultStay = activeStays[0];
    setSelectedStayId(defaultStay?.stayId || '');
    setAmount(defaultStay?.rentAmount || 1000000);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('bank_transfer');
    setPaymentStatus('paid');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleStayChange = (stayId: string) => {
    setSelectedStayId(stayId);
    const found = activeStays.find((s) => s.stayId === stayId);
    if (found) {
      setAmount(found.rentAmount);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayId || !amount || !paymentDate || !periodStart || !periodEnd) {
      setFormError('Mohon isi semua data yang wajib.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await api.post('/payments', {
        tenantStayId: selectedStayId,
        amount: Number(amount),
        paymentDate,
        periodStart,
        periodEnd,
        paymentMethod,
        status: paymentStatus,
        notes: notes || undefined,
      });

      setIsModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal menyimpan pembayaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (paymentId: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    try {
      await api.patch(`/payments/${paymentId}`, { status: newStatus });
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal memperbarui status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/payments/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus pembayaran.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const tenantName = p.tenantStay?.tenant?.name || '';
    const roomNumber = p.tenantStay?.room?.roomNumber || '';
    const propName = p.tenantStay?.room?.property?.name || '';

    const matchesSearch =
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pembayaran Sewa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan uang sewa masuk, verifikasi status lunas, dan rekap tagihan penghuni.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          disabled={activeStays.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">add_card</span>
          <span>+ Catat Pembayaran Baru</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[11px] text-emerald-600 font-bold uppercase block">Penerimaan Lunas</span>
          <span className="text-xl lg:text-2xl font-extrabold text-emerald-800 mt-0.5 block truncate">
            {formatRupiah(totalPaid)}
          </span>
          <span className="text-[11px] text-emerald-700 mt-1 block">Telah berhasil dicatat</span>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 shadow-sm">
          <span className="text-[11px] text-amber-700 font-bold uppercase block">Tagihan Pending</span>
          <span className="text-2xl font-extrabold text-amber-800 mt-0.5 block">{pendingCount}</span>
          <span className="text-[11px] text-amber-700 mt-1 block">Menunggu konfirmasi</span>
        </div>
        <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 shadow-sm">
          <span className="text-[11px] text-red-600 font-bold uppercase block">Jatuh Tempo (Overdue)</span>
          <span className="text-2xl font-extrabold text-red-800 mt-0.5 block">{overdueCount}</span>
          <span className="text-[11px] text-red-600 mt-1 block">Perlu diingatkan via WA</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Transaksi</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{payments.length}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Catatan tagihan sewa</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl gap-2 w-full md:w-80">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari penyewa, nomor kamar, kost..."
            className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none w-full md:w-auto"
          >
            <option value="all">Semua Status Pembayaran</option>
            <option value="paid">Lunas (Paid)</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="overdue">Jatuh Tempo (Overdue)</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <LoadingSpinner label="Memuat catatan transaksi sewa..." />
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon="payments"
          title="Tidak Ada Pembayaran Ditemukan"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Tidak ada data transaksi yang cocok dengan filter Anda.'
              : 'Belum ada catatan pembayaran sewa yang dibuat.'
          }
          actionText={activeStays.length > 0 ? '+ Catat Pembayaran Sekarang' : undefined}
          onAction={handleOpenModal}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="px-6 py-4">Penghuni & Kamar</th>
                  <th className="px-6 py-4">Periode Sewa</th>
                  <th className="px-6 py-4">Nominal</th>
                  <th className="px-6 py-4">Metode & Tgl Bayar</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const tenant = p.tenantStay?.tenant;
                  const room = p.tenantStay?.room;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center font-bold text-primary text-xs">
                            {room?.roomNumber || 'K'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {tenant?.name || 'Penyewa'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Kamar {room?.roomNumber} • {room?.property?.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-800 block">
                          {new Date(p.periodStart).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(p.periodStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' })} - {new Date(p.periodEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-900 text-sm block">
                          {formatRupiah(p.amount)}
                        </span>
                        {p.notes && <span className="text-[10px] text-slate-400 line-clamp-1">{p.notes}</span>}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 capitalize block">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(p.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
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
                          size="md"
                          dot
                        >
                          {p.status === 'paid' ? 'Lunas' : p.status === 'pending' ? 'Pending' : 'Overdue'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status !== 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'paid')}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="Tandai Sudah Lunas"
                            >
                              Tandai Lunas
                            </button>
                          )}

                          {p.status !== 'paid' && tenant?.phone && (
                            <a
                              href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}?text=Halo%20${encodeURIComponent(tenant.name)},%20tagihan%20sewa%20kamar%20${encodeURIComponent(room?.roomNumber || '')}%20periode%20${encodeURIComponent(new Date(p.periodStart).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }))}%20sebesar%20${encodeURIComponent(formatRupiah(p.amount))}%20belum%20tercatat%20lunas.%20Mohon%20segera%20dikonfirmasi.%20Terima%20kasih.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Kirim Pesan WhatsApp"
                            >
                              <span className="material-symbols-outlined text-[18px]">send</span>
                            </a>
                          )}

                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Catatan"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Catat Pembayaran */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Pembayaran Sewa Baru"
        description="Rekam transaksi uang sewa kamar yang masuk dari penghuni."
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Penghuni & Kamar *
            </label>
            <select
              value={selectedStayId}
              onChange={(e) => handleStayChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800"
            >
              {activeStays.map((s) => (
                <option key={s.stayId} value={s.stayId}>
                  {s.tenantName} — Kamar {s.roomNumber} ({s.propertyName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nominal Pembayaran (Rp) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Bayar *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Periode Awal Sewa *
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Periode Akhir Sewa *
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              >
                <option value="bank_transfer">Transfer Bank</option>
                <option value="cash">Tunai (Cash)</option>
                <option value="other">Lainnya / QRIS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Tagihan
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-bold text-slate-800"
              >
                <option value="paid">Lunas (Paid)</option>
                <option value="pending">Menunggu (Pending)</option>
                <option value="overdue">Jatuh Tempo (Overdue)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan / Bukti Transfer
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan (nomor referensi bank, keterangan sewa)..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Simpan Catatan Pembayaran</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Catatan Pembayaran?"
        message="Hapus catatan transaksi sewa ini secara permanen?"
        confirmText="Hapus"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
};
