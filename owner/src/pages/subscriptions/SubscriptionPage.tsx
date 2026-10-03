import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { Subscription, SubscriptionPlan, SubscriptionPayment } from '../../types';

interface PaymentMethodsData {
  bank: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  qris: {
    imageUrl: string;
    merchantName: string;
  };
}

export const SubscriptionPage: React.FC = () => {
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<SubscriptionPayment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'qris'>('bank_transfer');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const [currentRes, plansRes, historyRes, methodsRes] = await Promise.allSettled([
        api.get('/subscriptions/current'),
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/payments'),
        api.get('/subscriptions/payment-methods'),
      ]);

      if (currentRes.status === 'fulfilled' && currentRes.value.data?.data) {
        setCurrentSub(currentRes.value.data.data);
      }
      if (plansRes.status === 'fulfilled' && plansRes.value.data?.data) {
        setPlans(plansRes.value.data.data);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.data?.data) {
        setPaymentHistory(historyRes.value.data.data);
      }
      if (methodsRes.status === 'fulfilled' && methodsRes.value.data?.data) {
        setPaymentMethods(methodsRes.value.data.data);
      }
    } catch (e) {
      console.error('Failed to load subscription data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setPaymentMethod('bank_transfer');
    setNotes('');
    setProofFile(null);
    setUpgradeError(null);
    setUpgradeSuccess(null);
    setIsUpgradeModalOpen(true);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !proofFile) {
      setUpgradeError('Mohon lampirkan foto/file bukti transfer pembayaran.');
      return;
    }

    setIsSubmitting(true);
    setUpgradeError(null);

    const formData = new FormData();
    formData.append('planId', selectedPlan.id);
    formData.append('amount', String(selectedPlan.price));
    formData.append('paymentMethod', paymentMethod);
    if (notes) formData.append('notes', notes);
    formData.append('proof', proofFile);

    try {
      await api.post('/subscriptions/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUpgradeSuccess('Bukti pembayaran berhasil diunggah! Super Admin akan memverifikasi dalam 1x24 jam.');
      fetchSubscriptionData();
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
      }, 2500);
    } catch (err: any) {
      setUpgradeError(err.response?.data?.error?.message || 'Gagal mengirim konfirmasi pembayaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading && !currentSub) {
    return <LoadingSpinner label="Memuat status langganan SaaS KostKita..." />;
  }

  const daysLeft = currentSub
    ? Math.max(0, Math.ceil((new Date(currentSub.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Status Paket & Langganan SaaS
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola paket langganan aktif, kuota properti, dan perpanjangan layanan aplikasi KostKita.
        </p>
      </div>

      {/* Active Subscription Banner */}
      {currentSub ? (
        <div className="bg-gradient-to-r from-emerald-950 via-primary-container to-teal-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 text-emerald-300">
              <span className="material-symbols-outlined text-[32px]">loyalty</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  {currentSub.status.toUpperCase()}
                </Badge>
                <span className="text-xs font-semibold text-emerald-200">
                  Paket {currentSub.plan?.name}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                Aktif hingga {new Date(currentSub.endsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
                Tersisa <strong className="text-white underline">{daysLeft} hari lagi</strong>. Semua listing kost Anda aktif ditayangkan di pencarian Google Maps publik KostKita.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <button
              onClick={() => {
                const target = plans.find((p) => p.slug === 'pro') || plans[0];
                if (target) handleOpenUpgrade(target);
              }}
              className="px-6 py-3 bg-white hover:bg-emerald-50 text-primary text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">upgrade</span>
              <span>Upgrade / Perpanjang Paket</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl text-amber-900">
          <p className="text-sm font-bold">Belum Ada Paket Langganan Aktif</p>
          <p className="text-xs text-amber-700 mt-1">
            Silakan pilih paket di bawah untuk mengaktifkan visibilitas listing kost Anda.
          </p>
        </div>
      )}

      {/* Available Plans Comparison */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Pilihan Paket Langganan</h2>
          <p className="text-xs text-slate-500">Pilih paket sesuai dengan skala bisnis kost yang Anda kelola</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = currentSub?.plan?.id === p.id;
            const isPro = p.slug === 'pro';

            return (
              <div
                key={p.id}
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between relative ${
                  isPro
                    ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                    : 'border-slate-200/80 shadow-sm hover:shadow-md'
                }`}
              >
                {isPro && (
                  <span className="absolute -top-3 right-6 bg-primary text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Paling Populer
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-900">{p.name}</h3>
                    {isCurrent && (
                      <Badge variant="primary" size="sm">
                        Paket Anda
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {p.price === 0 ? 'Gratis' : formatRupiah(p.price)}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {' '}
                      / {p.durationDays} hari
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                    {p.features?.map((f) => (
                      <li key={f.id} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                          check_circle
                        </span>
                        <span>
                          <strong className="capitalize">{f.featureKey.replace('max_', 'Maks. ')}</strong>: {f.featureValue}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                        check_circle
                      </span>
                      <span>Listing aktif di Discovery & Peta</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                        check_circle
                      </span>
                      <span>Pengingat WhatsApp Tagihan</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenUpgrade(p)}
                    disabled={isCurrent}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : isPro
                        ? 'bg-primary hover:bg-primary-container text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <span>{isCurrent ? 'Sedang Digunakan' : `Pilih Paket ${p.name}`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
          Riwayat Pembayaran Langganan
        </h2>
        <p className="text-xs text-slate-500">
          Daftar pengajuan perpanjangan paket dan status verifikasi Super Admin.
        </p>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
              <tr>
                <th className="px-6 py-4">Nomor Invoice</th>
                <th className="px-6 py-4">Paket Dipilih</th>
                <th className="px-6 py-4">Metode</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Tanggal Pengajuan</th>
                <th className="px-6 py-4">Status Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentHistory.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-800">
                    {h.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {h.plan?.name || 'Paket Langganan'}
                  </td>
                  <td className="px-6 py-4">
                    {h.paymentMethod === 'qris' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        QRIS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Transfer Bank
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">
                    {formatRupiah(h.amount)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(h.paymentDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        h.status === 'approved'
                          ? 'success'
                          : h.status === 'pending'
                          ? 'warning'
                          : 'danger'
                      }
                      size="md"
                      dot
                    >
                      {h.status === 'approved'
                        ? 'Disetujui'
                        : h.status === 'pending'
                        ? 'Menunggu Review Admin'
                        : 'Ditolak'}
                    </Badge>
                    {h.rejectionReason && (
                      <p className="text-[11px] text-red-600 mt-1">Alasan: {h.rejectionReason}</p>
                    )}
                  </td>
                </tr>
              ))}

              {paymentHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada riwayat transaksi langganan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade / Payment Instructions Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title={`Konfirmasi Pembayaran Paket ${selectedPlan?.name}`}
        description="Pilih metode pembayaran dan unggah bukti transfer/pembayaran."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitProof} className="space-y-4">
          {upgradeError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {upgradeError}
            </div>
          )}
          {upgradeSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
              {upgradeSuccess}
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Metode Pembayaran *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'bank_transfer' | 'qris')}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 bg-white cursor-pointer shadow-sm"
            >
              <option value="bank_transfer">Transfer Bank (BCA, Mandiri, BRI, BNI, dll)</option>
              <option value="qris">QRIS (GoPay, OVO, DANA, ShopeePay, m-Banking)</option>
            </select>
          </div>

          {/* Dynamic Instructions Card */}
          {paymentMethod === 'bank_transfer' ? (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Rekening Resmi Pembayaran SaaS KostKita:
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                  Transfer Bank
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {paymentMethods?.bank?.bankName || 'Bank Central Asia (BCA)'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-600">
                      No. Rekening:{' '}
                      <strong className="font-mono text-primary text-sm font-bold">
                        {paymentMethods?.bank?.accountNumber || '1234567890'}
                      </strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentMethods?.bank?.accountNumber || '1234567890', 'rek')}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition"
                    >
                      {copiedKey === 'rek' ? 'Disalin!' : 'Salin'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Atas Nama: {paymentMethods?.bank?.accountName || 'PT KostKita Indonesia'}
                  </p>
                </div>
                <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
                  <span className="text-[11px] text-slate-400 block">Nominal Transfer:</span>
                  <div className="flex sm:justify-end items-center gap-2">
                    <span className="text-lg font-black text-primary">
                      {formatRupiah(selectedPlan?.price || 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(selectedPlan?.price || 0), 'nominal')}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition"
                    >
                      {copiedKey === 'nominal' ? 'Disalin!' : 'Salin'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Scan QRIS Resmi SaaS KostKita:
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                  QRIS Standar Nasional
                </span>
              </div>

              <div className="text-center py-1">
                {paymentMethods?.qris?.imageUrl ? (
                  <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200 shadow-sm mx-auto">
                    <img
                      src={paymentMethods.qris.imageUrl}
                      alt="QRIS KostKita"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-300 text-center max-w-sm mx-auto">
                    <span className="material-symbols-outlined text-4xl text-slate-400">qr_code_2</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">Kode QRIS Belum Diunggah oleh Admin</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Silakan pilih metode Transfer Bank atau hubungi Super Admin.
                    </p>
                  </div>
                )}
                <p className="text-xs font-bold text-slate-800 mt-2">
                  Merchant: {paymentMethods?.qris?.merchantName || 'KostKita Indonesia'}
                </p>
                <div className="flex justify-center items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Nominal:</span>
                  <span className="text-base font-black text-primary">
                    {formatRupiah(selectedPlan?.price || 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(selectedPlan?.price || 0), 'nominal-qris')}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition"
                  >
                    {copiedKey === 'nominal-qris' ? 'Disalin!' : 'Salin'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Mendukung m-Banking BCA, Mandiri, BRI, BNI, serta e-wallet GoPay, OVO, DANA, ShopeePay, LinkAja.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Upload Bukti Pembayaran (Foto/Struk/PDF) *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              required
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-fixed/50 file:text-primary hover:file:bg-primary-fixed cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Tambahan (Nama Pengirim / No. Rek / E-Wallet)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contoh: Transfer atas nama Budi Santoso / Pembayaran QRIS via GoPay..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(false)}
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
              <span>Kirim Bukti Pembayaran</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
