import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { TenantPayment, Tenant, Property } from '../../types';

export const PaymentListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dues' | 'history'>('dues');

  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters - Tab 1 (Dues & Reminders)
  const [dueSearchQuery, setDueSearchQuery] = useState('');
  const [dueStatusFilter, setDueStatusFilter] = useState<'all' | 'due_soon' | 'overdue' | 'paid'>('all');
  const [duePropertyFilter, setDuePropertyFilter] = useState('');

  // Search & Filters - Tab 2 (Payment History)
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

  // Modal: Catat Pembayaran
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStayId, setSelectedStayId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'other'>('bank_transfer');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'overdue'>('paid');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete payment
  const [deleteTarget, setDeleteTarget] = useState<TenantPayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatLocalYMD = (val: string | Date | undefined) => {
    if (!val) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.slice(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [payRes, tenantsRes, propsRes] = await Promise.allSettled([
        api.get('/payments'),
        api.get('/tenants'),
        api.get('/properties'),
      ]);

      if (payRes.status === 'fulfilled' && payRes.value.data?.data) {
        setPayments(payRes.value.data.data);
      }
      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.data?.data) {
        setTenants(tenantsRes.value.data.data);
      }
      if (propsRes.status === 'fulfilled' && propsRes.value.data?.data) {
        setProperties(propsRes.value.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch payment data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Flatten active stays with tenant and room context
  const activeStaysList = tenants.flatMap((t) => {
    const stays = (t.stays || []).filter((s) => s.status === 'active');
    return stays.map((s) => ({
      stayId: s.id,
      stay: s,
      tenant: t,
      room: s.room,
      dueInfo: s.dueInfo,
      rentAmount: Number(s.rentAmount || (s as any).rentPrice || 0),
      deposit: Number(s.deposit || 0),
    }));
  });

  const dueSoonCount = activeStaysList.filter(
    (item) => item.dueInfo?.dueStatus === 'due_soon' || item.dueInfo?.dueStatus === 'due_today'
  ).length;

  const overdueDuesCount = activeStaysList.filter(
    (item) => item.dueInfo?.dueStatus === 'overdue'
  ).length;

  const paidDuesCount = activeStaysList.filter(
    (item) => item.dueInfo?.dueStatus === 'paid'
  ).length;

  const handleOpenAddModal = (prefillStay?: typeof activeStaysList[0]) => {
    const target = prefillStay || activeStaysList[0];
    const todayStr = formatLocalYMD(new Date());

    if (target) {
      setSelectedStayId(target.stayId);
      setAmount(target.rentAmount || 1000000);
      setPeriodStart(target.dueInfo?.suggestedPeriodStart || todayStr);
      setPeriodEnd(target.dueInfo?.suggestedPeriodEnd || target.dueInfo?.nextDueDate || todayStr);
    } else {
      setSelectedStayId('');
      setAmount(1000000);
      setPeriodStart(todayStr);
      setPeriodEnd(todayStr);
    }

    setPaymentDate(todayStr);
    setPaymentMethod('bank_transfer');
    setPaymentStatus('paid');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleStaySelectChange = (stayId: string) => {
    setSelectedStayId(stayId);
    const found = activeStaysList.find((s) => s.stayId === stayId);
    if (found) {
      setAmount(found.rentAmount);
      if (found.dueInfo?.suggestedPeriodStart) {
        setPeriodStart(found.dueInfo.suggestedPeriodStart);
      }
      if (found.dueInfo?.suggestedPeriodEnd) {
        setPeriodEnd(found.dueInfo.suggestedPeriodEnd);
      }
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayId || !amount || !paymentDate || !periodStart || !periodEnd) {
      setFormError('Mohon lengkapi semua kolom yang bertanda bintang (*).');
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
        notes: notes.trim() || undefined,
      });

      setIsModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal menyimpan pembayaran sewa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (paymentId: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    try {
      await api.patch(`/payments/${paymentId}`, { status: newStatus });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal memperbarui status pembayaran.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/payments/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus catatan pembayaran.');
    } finally {
      setIsDeleting(false);
    }
  };

  const generateWaReminderUrl = (item: typeof activeStaysList[0]) => {
    const phone = (item.tenant.phone || (item.tenant as any).whatsapp || '').replace(/\D/g, '');
    if (!phone) return '#';

    const propName = item.room?.property?.name || 'KostKita';
    const roomNumber = item.room?.roomNumber ? `Kamar ${item.room.roomNumber}` : 'Kamar Kost';
    const amountStr = formatRupiah(item.rentAmount);
    const dueDateStr = item.dueInfo?.nextDueDateFormatted || 'segera';
    const dueStatusText = item.dueInfo?.dueText || '';

    const msg = `Halo Kak ${item.tenant.name} 👋,

Mengingatkan untuk pembayaran sewa di ${propName} (${roomNumber}):
• Periode: Sewa Bulanan
• Nominal: ${amountStr}
• Tanggal Jatuh Tempo: ${dueDateStr}
${dueStatusText ? `• Status Tagihan: ${dueStatusText}\n` : ''}
Pembayaran dapat ditransfer ke rekening pengelola kost atau dibayarkan langsung.
Mohon konfirmasi atau kirimkan bukti transfer jika sudah melakukan pembayaran ya. Terima kasih banyak! 🙏`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateSafe = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Filtered Dues (Tab 1)
  const filteredDues = activeStaysList.filter((item) => {
    const q = dueSearchQuery.toLowerCase();
    const nameStr = (item.tenant.name || '').toLowerCase();
    const phoneStr = (item.tenant.phone || (item.tenant as any).whatsapp || '').toLowerCase();
    const roomStr = (item.room?.roomNumber || '').toLowerCase();
    const propStr = (item.room?.property?.name || '').toLowerCase();

    const matchesSearch = !q || nameStr.includes(q) || phoneStr.includes(q) || roomStr.includes(q) || propStr.includes(q);
    const matchesProperty = !duePropertyFilter || item.room?.propertyId === duePropertyFilter || (item.room as any)?.property?.id === duePropertyFilter;

    const dueStatus = item.dueInfo?.dueStatus;
    const matchesStatus =
      dueStatusFilter === 'all' ||
      (dueStatusFilter === 'due_soon' && (dueStatus === 'due_soon' || dueStatus === 'due_today')) ||
      (dueStatusFilter === 'overdue' && dueStatus === 'overdue') ||
      (dueStatusFilter === 'paid' && dueStatus === 'paid');

    return matchesSearch && matchesProperty && matchesStatus;
  });

  // Filtered History (Tab 2)
  const filteredPayments = payments.filter((p) => {
    const tenantName = p.tenantStay?.tenant?.name || '';
    const roomNumber = p.tenantStay?.room?.roomNumber || '';
    const propName = p.tenantStay?.room?.property?.name || '';

    const matchesSearch =
      tenantName.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      roomNumber.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      propName.toLowerCase().includes(historySearchQuery.toLowerCase());

    const matchesStatus = historyStatusFilter === 'all' || p.status === historyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pembayaran & Tagihan Sewa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau tagihan jatuh tempo, kirim pengingat WhatsApp ke penghuni, dan catat riwayat pembayaran sewa kost.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          disabled={activeStaysList.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_card</span>
          <span>+ Catat Pembayaran Baru</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('dues')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'dues'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">alarm</span>
          <span>Tagihan & Pengingat Jatuh Tempo</span>
          {(dueSoonCount > 0 || overdueDuesCount > 0) && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              {dueSoonCount + overdueDuesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Riwayat Transaksi Pembayaran</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {payments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DUES & REMINDERS */}
      {activeTab === 'dues' && (
        <div className="space-y-6">
          {/* Due Reminder Alert Banner */}
          {(dueSoonCount > 0 || overdueDuesCount > 0) && (
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">notification_important</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Pengingat Pembayaran Sewa Kost
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {overdueDuesCount > 0 && <span className="font-bold text-red-700">{overdueDuesCount} penyewa menunggak. </span>}
                    {dueSoonCount > 0 && <span>{dueSoonCount} penyewa mendekati / jatuh tempo pembayaran bulan ini.</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDueStatusFilter(dueStatusFilter === 'due_soon' ? 'all' : 'due_soon')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    dueStatusFilter === 'due_soon'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white hover:bg-amber-100/70 text-amber-800 border border-amber-200'
                  }`}
                >
                  Lihat Perlu Ditagih
                </button>
                {overdueDuesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDueStatusFilter(dueStatusFilter === 'overdue' ? 'all' : 'overdue')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      dueStatusFilter === 'overdue'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white hover:bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    Lihat Menunggak
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dues KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Penyewa Aktif</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{activeStaysList.length}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Total kamar terisi</span>
            </div>
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 shadow-sm">
              <span className="text-[11px] text-amber-700 font-bold uppercase block">Perlu Ditagih</span>
              <span className="text-2xl font-extrabold text-amber-800 mt-0.5 block">{dueSoonCount}</span>
              <span className="text-[11px] text-amber-700 mt-1 block">Jatuh tempo dlm 7 hari</span>
            </div>
            <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 shadow-sm">
              <span className="text-[11px] text-red-600 font-bold uppercase block">Menunggak (Overdue)</span>
              <span className="text-2xl font-extrabold text-red-800 mt-0.5 block">{overdueDuesCount}</span>
              <span className="text-[11px] text-red-600 mt-1 block">Melewati tanggal jatuh tempo</span>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-sm">
              <span className="text-[11px] text-emerald-600 font-bold uppercase block">Lunas Periode Ini</span>
              <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 block">{paidDuesCount}</span>
              <span className="text-[11px] text-emerald-700 mt-1 block">Sudah membayar sewa</span>
            </div>
          </div>

          {/* Dues Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl gap-2 w-full sm:w-72">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  value={dueSearchQuery}
                  onChange={(e) => setDueSearchQuery(e.target.value)}
                  placeholder="Cari nama, WhatsApp, no kamar..."
                  className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
                />
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setDueStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    dueStatusFilter === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({activeStaysList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDueStatusFilter('due_soon')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                    dueStatusFilter === 'due_soon'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">alarm</span>
                  <span>Perlu Ditagih {dueSoonCount > 0 ? `(${dueSoonCount})` : ''}</span>
                </button>
                {overdueDuesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDueStatusFilter('overdue')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                      dueStatusFilter === 'overdue'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">warning</span>
                    <span>Menunggak ({overdueDuesCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDueStatusFilter('paid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                    dueStatusFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Lunas ({paidDuesCount})</span>
                </button>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <select
                value={duePropertyFilter}
                onChange={(e) => setDuePropertyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none w-full md:w-auto cursor-pointer"
              >
                <option value="">Semua Properti Kost</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dues Table */}
          {isLoading ? (
            <LoadingSpinner label="Memuat status tagihan sewa..." />
          ) : filteredDues.length === 0 ? (
            <EmptyState
              icon="event_upcoming"
              title="Tidak Ada Tagihan Ditemukan"
              description={
                dueSearchQuery || dueStatusFilter !== 'all' || duePropertyFilter
                  ? 'Tidak ada data tagihan yang sesuai dengan filter pencarian Anda.'
                  : 'Belum ada penghuni aktif dengan tagihan berjalan.'
              }
              actionText={dueStatusFilter !== 'all' ? 'Reset Filter' : undefined}
              onAction={() => setDueStatusFilter('all')}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="px-6 py-4">Penyewa & Kontak</th>
                      <th className="px-6 py-4">Kamar & Properti</th>
                      <th className="px-6 py-4">Tarif Bulanan</th>
                      <th className="px-6 py-4">Jatuh Tempo & Status</th>
                      <th className="px-6 py-4 text-right">Aksi Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDues.map((item) => {
                      const displayPhone = item.tenant.phone || (item.tenant as any).whatsapp || '';
                      const due = item.dueInfo;

                      return (
                        <tr key={item.stayId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-primary-fixed/50 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                                {(item.tenant.name || 'P').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 text-sm block">
                                  {item.tenant.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-slate-500">{displayPhone || '-'}</span>
                                  {displayPhone && (
                                    <a
                                      href={`https://wa.me/${displayPhone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-600 hover:text-emerald-700 inline-flex items-center"
                                      title="Chat WhatsApp Biasa"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">chat</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800 block">
                              Kamar {item.room?.roomNumber || '-'} ({item.room?.type || 'Standar'})
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {item.room?.property?.name || 'Properti Kost'}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-extrabold text-slate-900 text-sm block">
                              {formatRupiah(item.rentAmount)}
                              <span className="text-[10px] text-slate-400 font-normal"> /bln</span>
                            </span>
                            {item.deposit > 0 && (
                              <span className="text-[11px] text-emerald-700">
                                Deposit: {formatRupiah(item.deposit)}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {due ? (
                              <div className="space-y-1">
                                <div
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    due.dueStatus === 'due_today'
                                      ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                                      : due.dueStatus === 'due_soon'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : due.dueStatus === 'overdue'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : due.dueStatus === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {due.dueStatus === 'due_today'
                                      ? 'priority_high'
                                      : due.dueStatus === 'due_soon'
                                      ? 'alarm'
                                      : due.dueStatus === 'overdue'
                                      ? 'warning'
                                      : due.dueStatus === 'paid'
                                      ? 'check_circle'
                                      : 'calendar_month'}
                                  </span>
                                  <span>{due.dueText}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  Jatuh Tempo: <strong>{due.nextDueDateFormatted}</strong>
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {displayPhone && (
                                <a
                                  href={generateWaReminderUrl(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                  title="Kirimkan rincian tagihan sewa ke nomor WhatsApp penghuni"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-emerald-600">send</span>
                                  <span>Kirim WA Tagihan</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenAddModal(item)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                                title="Catat pelunasan sewa untuk siklus ini"
                              >
                                <span className="material-symbols-outlined text-[15px]">payments</span>
                                <span>Catat Bayar</span>
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
        </div>
      )}

      {/* TAB 2: PAYMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History KPI Cards */}
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

          {/* History Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl gap-2 w-full md:w-80">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Cari penyewa, nomor kamar, kost..."
                className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none w-full md:w-auto cursor-pointer"
              >
                <option value="all">Semua Status Pembayaran</option>
                <option value="paid">Lunas (Paid)</option>
                <option value="pending">Menunggu (Pending)</option>
                <option value="overdue">Jatuh Tempo (Overdue)</option>
              </select>
            </div>
          </div>

          {/* Payments History Table */}
          {isLoading ? (
            <LoadingSpinner label="Memuat catatan transaksi sewa..." />
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              icon="payments"
              title="Tidak Ada Pembayaran Ditemukan"
              description={
                historySearchQuery || historyStatusFilter !== 'all'
                  ? 'Tidak ada data transaksi yang cocok dengan filter Anda.'
                  : 'Belum ada catatan pembayaran sewa yang dibuat.'
              }
              actionText={activeStaysList.length > 0 ? '+ Catat Pembayaran Sekarang' : undefined}
              onAction={() => handleOpenAddModal()}
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
                              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center font-bold text-primary text-xs shrink-0">
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
                            <span className="font-semibold text-slate-800 block">
                              {formatDateSafe(p.periodStart)} s/d {formatDateSafe(p.periodEnd)}
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
                              {p.paymentMethod === 'bank_transfer'
                                ? 'Transfer Bank'
                                : p.paymentMethod === 'cash'
                                ? 'Tunai (Cash)'
                                : 'QRIS / E-Wallet'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateSafe(p.paymentDate)}
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
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {p.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(p.id, 'paid')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                  title="Tandai pembayaran ini telah lunas"
                                >
                                  Tandai Lunas
                                </button>
                              )}

                              {p.status === 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(p.id, 'pending')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Kembalikan status ke pending"
                                >
                                  Batal Lunas
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(p)}
                                className="px-2 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus transaksi"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
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
        </div>
      )}

      {/* Modal: Catat Pembayaran Baru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Pembayaran Sewa"
        description="Masukkan data penerimaan uang sewa dari penghuni kost."
        maxWidth="md"
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
              onChange={(e) => handleStaySelectChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800 cursor-pointer bg-white"
            >
              <option value="">-- Pilih Penghuni Aktif --</option>
              {activeStaysList.map((item) => (
                <option key={item.stayId} value={item.stayId}>
                  {item.tenant.name} - Kamar {item.room?.roomNumber || '?'} ({item.room?.property?.name || 'Kost'}) - {formatRupiah(item.rentAmount)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Awal Periode *
              </label>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Akhir Periode *
              </label>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nominal Bayar (Rp) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Pembayaran *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 cursor-pointer"
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
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 bg-white cursor-pointer"
              >
                <option value="bank_transfer">Transfer Bank</option>
                <option value="cash">Tunai (Cash)</option>
                <option value="other">QRIS / E-Wallet / Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Pembayaran
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 bg-white cursor-pointer font-bold"
              >
                <option value="paid">Lunas (Paid)</option>
                <option value="pending">Menunggu (Pending)</option>
                <option value="overdue">Jatuh Tempo (Overdue)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Pembayaran (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Transfer BCA a/n Budi lunas"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Simpan Pembayaran</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Catatan Pembayaran"
        message="Apakah Anda yakin ingin menghapus data pembayaran ini? Tindakan ini tidak dapat dibatalkan."
        confirmText={isDeleting ? 'Menghapus...' : 'Hapus'}
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
