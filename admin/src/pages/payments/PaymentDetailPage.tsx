import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { SubPayment } from '../../types';
import { EmptyState, PageHeader, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { ConfirmDialog, ReasonDialog } from '../../components/ui/Dialogs';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { assetUrl, fmtDate, fmtDateTime, rupiah } from '../../lib/format';

export const PaymentDetailPage: React.FC = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [zoom, setZoom] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => (await api.get(`/admin/payments/${id}`)).data.data as SubPayment,
  });

  const done = () => {
    qc.invalidateQueries({ queryKey: ['payment', id] });
    qc.invalidateQueries({ queryKey: ['payments'] });
    qc.invalidateQueries({ queryKey: ['badge-counts'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['subscriptions'] });
  };

  const approve = useMutation({
    mutationFn: () => api.post(`/subscriptions/admin/payments/${id}/approve`),
    onSuccess: () => { toast('Pembayaran disetujui. Subscription owner telah diaktifkan.'); setApproveOpen(false); done(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
  const reject = useMutation({
    mutationFn: (reason: string) => api.post(`/subscriptions/admin/payments/${id}/reject`, { reason }),
    onSuccess: () => { toast('Pembayaran ditolak.', 'info'); setRejectOpen(false); done(); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  if (isLoading) return <Spinner />;
  if (!p) return <EmptyState icon="receipt_long" title="Pembayaran tidak ditemukan" />;

  const isImg = p.proofUrl && !/\.pdf($|\?)/i.test(p.proofUrl);
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-ink-100 last:border-0"><dt className="text-sm text-ink-500">{k}</dt><dd className="text-sm font-bold text-ink-900 text-right">{v}</dd></div>
  );

  return (
    <>
      <PageHeader
        back={<Link to="/admin/payments" className="inline-flex items-center gap-1 text-xs font-bold text-ink-400 hover:text-brand-600 mb-2"><span className="material-symbols-outlined text-[16px]">arrow_back</span>Kembali ke Payments</Link>}
        title={p.referenceNo}
        subtitle={`Diajukan ${fmtDateTime(p.createdAt)}`}
        actions={p.status === 'pending' ? (
          <>
            <button id="reject-btn" className="btn-danger" onClick={() => setRejectOpen(true)}><span className="material-symbols-outlined text-[18px]">close</span>Reject</button>
            <button id="approve-btn" className="btn-primary" onClick={() => setApproveOpen(true)}><span className="material-symbols-outlined text-[18px]">check</span>Approve</button>
          </>
        ) : <StatusBadge status={p.status} />}
      />

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-extrabold text-ink-900 mb-2">Detail Pembayaran</h2>
          <dl>
            <Row k="Owner" v={<Link to={`/admin/owners/${p.owner.id}`} className="text-brand-700 hover:underline">{p.owner.name}</Link>} />
            <Row k="Email" v={p.owner.email} />
            <Row k="Paket" v={p.plan.name} />
            <Row k="Durasi" v={p.plan.durationDays ? `${p.plan.durationDays} hari` : '—'} />
            <Row k="Nominal" v={<span className="text-lg text-brand-700">{rupiah(p.amount)}</span>} />
            <Row k="Harga paket" v={p.plan.price != null ? rupiah(p.plan.price) : '—'} />
            <Row k="Tanggal bayar" v={fmtDate(p.paymentDate)} />
            <Row k="Metode" v={<span className="capitalize">{p.paymentMethod}</span>} />
            <Row k="Status" v={<StatusBadge status={p.status} />} />
            {p.reviewedAt && <Row k="Ditinjau" v={`${fmtDateTime(p.reviewedAt)}${p.reviewer ? ` oleh ${p.reviewer.name}` : ''}`} />}
          </dl>
          {p.plan.price != null && Number(p.amount) !== Number(p.plan.price) && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 ring-1 ring-amber-600/20 text-xs text-amber-800 flex gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>Nominal berbeda dari harga paket ({rupiah(p.plan.price)}). Periksa bukti dengan teliti.
            </div>
          )}
          {p.notes && <div className="mt-4"><p className="label">Catatan owner</p><p className="text-sm text-ink-600 bg-ink-50 rounded-xl p-3">{p.notes}</p></div>}
          {p.rejectionReason && <div className="mt-4"><p className="label">Alasan penolakan</p><p className="text-sm text-rose-700 bg-rose-50 rounded-xl p-3">{p.rejectionReason}</p></div>}
        </div>

        <div className="card p-5 lg:col-span-3">
          <h2 className="font-extrabold text-ink-900 mb-3">Bukti Pembayaran</h2>
          {!p.proofUrl ? <EmptyState icon="image_not_supported" title="Tidak ada bukti diunggah" /> : isImg ? (
            <button onClick={() => setZoom(true)} className="block w-full rounded-2xl overflow-hidden bg-ink-100 ring-1 ring-ink-200 group relative">
              <img src={assetUrl(p.proofUrl)} alt="Bukti pembayaran" className="w-full max-h-[560px] object-contain" />
              <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-ink-900/70 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">zoom_in</span>Perbesar</span>
            </button>
          ) : (
            <a href={assetUrl(p.proofUrl)} target="_blank" rel="noopener noreferrer" className="btn-secondary"><span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>Buka bukti (PDF)</a>
          )}
        </div>
      </div>

      <Modal isOpen={zoom} onClose={() => setZoom(false)} title="Bukti Pembayaran" maxWidth="3xl">
        <img src={assetUrl(p.proofUrl)} alt="Bukti pembayaran" className="w-full rounded-xl" />
      </Modal>
      <ConfirmDialog isOpen={approveOpen} onClose={() => setApproveOpen(false)} onConfirm={() => approve.mutateAsync()} title="Setujui Pembayaran" confirmText="Setujui & Aktifkan"
        message={<>Subscription <b>{p.plan.name}</b> untuk <b>{p.owner.name}</b> akan langsung diaktifkan selama {p.plan.durationDays ?? '—'} hari dan owner diberi notifikasi.</>} />
      <ReasonDialog isOpen={rejectOpen} onClose={() => setRejectOpen(false)} onSubmit={(r) => reject.mutateAsync(r)} title="Tolak Pembayaran" description="Alasan akan dikirim ke owner agar dapat mengajukan ulang." submitText="Tolak Pembayaran" placeholder="Contoh: Bukti transfer tidak terbaca / nominal tidak sesuai." />
    </>
  );
};
