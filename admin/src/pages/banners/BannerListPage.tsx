import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { BannerItem } from '../../types';
import { EmptyState, PageHeader, Pill, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Dialogs';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';


export const BannerListPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [form, setForm] = useState<Partial<BannerItem>>({
    title: '',
    subtitle: '',
    badgeText: 'PROMO BULAN INI',
    targetUrl: '#/search',
    ctaText: 'Lihat Promo',
    imageUrl: '',
    isActive: true,
    order: 1,
  });

  const { data: banners, isLoading } = useQuery<BannerItem[]>({
    queryKey: ['admin-banners'],
    queryFn: async () => (await api.get('/admin/banners')).data.data,
  });

  const openCreateModal = () => {
    setEditingBanner(null);
    setForm({
      title: '',
      subtitle: '',
      badgeText: 'PROMO SPESIAL',
      targetUrl: '#/search',
      ctaText: 'Lihat Promo',
      imageUrl: '',
      isActive: true,
      order: (banners?.length || 0) + 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (b: BannerItem) => {
    setEditingBanner(b);
    setForm(b);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingBanner) {
        return (await api.put(`/admin/banners/${editingBanner.id}`, form)).data;
      } else {
        return (await api.post('/admin/banners', form)).data;
      }
    },
    onSuccess: (res) => {
      toast(res?.message || 'Banner berhasil disimpan.');
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: (err) => toast(errMsg(err), 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (b: BannerItem) => {
      return (await api.put(`/admin/banners/${b.id}`, { isActive: !b.isActive })).data;
    },
    onSuccess: () => {
      toast('Status banner diperbarui.');
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: (err) => toast(errMsg(err), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/admin/banners/${id}`)).data;
    },
    onSuccess: () => {
      toast('Banner berhasil dihapus.');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: (err) => {
      toast(errMsg(err), 'error');
      setDeleteTarget(null);
    },
  });

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('image', file);
    setIsUploading(true);

    try {
      const res = await api.post('/admin/banners/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (url) {
        setForm((prev) => ({ ...prev, imageUrl: url }));
        toast('Gambar banner berhasil diunggah.');
      }
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Banner Promosi"
        subtitle="Atur spanduk bergerak (carousel) di halaman utama publik untuk promo, diskon, pengumuman, atau program kemitraan."
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Tambah Banner Baru</span>
          </button>
        }
      />

      {isLoading ? (
        <Spinner label="Memuat banner promosi..." />
      ) : !banners?.length ? (
        <EmptyState
          icon="view_carousel"
          title="Belum ada banner"
          description="Tambahkan banner pertama Anda untuk ditampilkan pada slider halaman utama publik."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {banners.map((b) => (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-2xs ${b.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
                  }`}
              >
                {/* Live Card Preview Box (Clean Photo + Neutral Scrim) */}
                <div className="p-6 bg-slate-950 text-white relative overflow-hidden min-h-[160px] flex flex-col justify-between">
                  {b.imageUrl ? (
                    <>
                      <img
                        src={b.imageUrl}
                        alt={b.title}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20 pointer-events-none" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 pointer-events-none" />
                  )}

                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-md">
                      {b.badgeText || 'PROMO'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/30 backdrop-blur-xs text-white">
                        Urutan #{b.order}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 mt-4">
                    <h3 className="text-lg font-black tracking-tight leading-snug line-clamp-1">{b.title}</h3>
                    <p className="text-xs mt-1 line-clamp-2 text-white/80">{b.subtitle}</p>
                  </div>

                  <div className="relative z-10 mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-bold shadow-xs">
                      <span>{b.ctaText || 'Lihat Promo'}</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                    <span className="text-[10px] text-white/70 truncate max-w-[200px]">
                      {b.targetUrl}
                    </span>
                  </div>
                </div>

                {/* Card Controls Footer */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Pill tone={b.isActive ? 'green' : 'gray'}>
                      {b.isActive ? 'Aktif Tayang' : 'Nonaktif'}
                    </Pill>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(b)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${b.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                      {b.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(b)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                      title="Hapus Banner"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal Add / Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBanner ? 'Edit Banner Promosi' : 'Tambah Banner Promosi Baru'}
        description="Konfigurasikan judul, teks ajakan, target URL, serta gambar tampilan banner."
        maxWidth="xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Utama Banner <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="cth: Diskon Spesial Mahasiswa Baru s/d 25%"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Singkat / Subtitle <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={form.subtitle || ''}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="cth: Temukan kost favorit di dekat kampus idamanmu dengan potongan biaya sewa dan gratis WiFi."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Badge Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teks Badge / Tagline
              </label>
              <input
                type="text"
                value={form.badgeText || ''}
                onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                placeholder="cth: PROMO BULAN INI, GARANSI 100%"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* CTA Button Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teks Tombol Aksi (CTA)
              </label>
              <input
                type="text"
                value={form.ctaText || ''}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                placeholder="cth: Lihat Promo, Cari Kost Sekarang"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Target URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tujuan Link (Target URL) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.targetUrl || ''}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              placeholder="cth: #/search, #/search?city=Padang"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Image URL & Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Gambar Banner (Opsional / Background)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.imageUrl || ''}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/... atau unggah gambar"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1 transition">
                <span className="material-symbols-outlined text-[16px]">upload</span>
                <span>{isUploading ? 'Mengunggah...' : 'Unggah File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
            {form.imageUrl && (
              <div className="mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imageUrl: '' })}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black text-white rounded-full text-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Sort Order */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Urutan Slider (Order)
              </label>
              <input
                type="number"
                min={1}
                value={form.order || 1}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="bannerIsActive"
                checked={form.isActive ?? true}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
              />
              <label htmlFor="bannerIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                Aktifkan Banner di Publik
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Banner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Hapus Banner Promosi?"
          message={`Apakah Anda yakin ingin menghapus banner "${deleteTarget.title}"? Banner ini tidak akan muncul lagi di halaman utama.`}
          confirmText="Hapus Banner"
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
          tone="danger"
        />
      )}
    </div>
  );
};

export default BannerListPage;
