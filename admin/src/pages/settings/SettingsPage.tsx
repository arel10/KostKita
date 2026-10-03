import React, { useEffect, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { Plan } from '../../types';
import { PageHeader, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../context/ToastContext';

type S = Record<string, string>;

const sections: { title: string; icon: string; fields: { key: string; label: string; hint?: string; type?: string }[] }[] = [
  { title: 'Umum', icon: 'tune', fields: [
    { key: 'app_name', label: 'Nama aplikasi' },
    { key: 'app_logo_url', label: 'URL logo', hint: 'Alamat gambar logo (https://…)' },
    { key: 'contact_email', label: 'Email kontak', type: 'email' },
    { key: 'support_whatsapp', label: 'WhatsApp support', hint: 'Format 62812xxxxxxx' },
  ] },
  { title: 'Rekening Pembayaran Subscription (Transfer Bank)', icon: 'account_balance', fields: [
    { key: 'payment_bank_name', label: 'Nama bank' },
    { key: 'payment_account_number', label: 'Nomor rekening' },
    { key: 'payment_account_name', label: 'Atas nama' },
  ] },
  { title: 'Pembayaran Subscription QRIS', icon: 'qr_code_2', fields: [
    { key: 'payment_qris_name', label: 'Nama merchant QRIS', hint: 'Contoh: KostKita Indonesia / PT KostKita Solusi Digital' },
    { key: 'payment_qris_image_url', label: 'URL Gambar QRIS', hint: 'Link gambar QRIS atau unggah file di bawah' },
  ] },
];

export const SettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<S>({});
  const [isUploadingQris, setIsUploadingQris] = useState(false);
  const qrisFileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get('/admin/settings')).data.data as S });
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get('/admin/plans')).data.data as Plan[] });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: () => api.patch('/admin/settings', form),
    onSuccess: () => { toast('Pengaturan berhasil disimpan.'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

  const handleUploadQris = async (file: File) => {
    setIsUploadingQris(true);
    const fd = new FormData();
    fd.append('qris', file);

    try {
      const res = await api.post('/admin/settings/upload-qris', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (url) {
        setForm((prev) => ({ ...prev, payment_qris_image_url: url }));
        toast('Gambar QRIS berhasil diunggah!');
        qc.invalidateQueries({ queryKey: ['settings'] });
      }
    } catch (e) {
      toast(errMsg(e) || 'Gagal mengunggah QRIS', 'error');
    } finally {
      setIsUploadingQris(false);
      if (qrisFileInputRef.current) qrisFileInputRef.current.value = '';
    }
  };

  if (isLoading) return <Spinner />;
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const maintenance = form.maintenance_mode === 'true';
  const dirty = JSON.stringify(form) !== JSON.stringify(data ?? {});

  return (
    <>
      <PageHeader title="Settings" subtitle="Konfigurasi sistem KostKita." actions={
        <button id="save-settings" className="btn-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          <span className="material-symbols-outlined text-[18px]">save</span>{save.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
        </button>
      } />

      <div className="grid lg:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.title} className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-brand-600">{s.icon}</span>
              <h2 className="font-extrabold text-ink-900">{s.title}</h2>
            </div>
            <div className="space-y-4">
              {s.fields.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={f.key}>{f.label}</label>
                  <input id={f.key} type={f.type ?? 'text'} className="input" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                  {f.hint && <p className="text-[11px] text-ink-400 mt-1">{f.hint}</p>}
                </div>
              ))}

              {s.title.includes('QRIS') && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="label">Upload File Gambar QRIS</label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={qrisFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadQris(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploadingQris}
                      onClick={() => qrisFileInputRef.current?.click()}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      {isUploadingQris ? 'Mengunggah...' : 'Pilih File Gambar QRIS'}
                    </button>
                    {form.payment_qris_image_url && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Gambar terpasang
                      </span>
                    )}
                  </div>

                  {form.payment_qris_image_url && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block">
                      <p className="text-[11px] font-bold text-slate-500 mb-2">Preview Gambar QRIS:</p>
                      <img
                        src={form.payment_qris_image_url}
                        alt="Preview QRIS"
                        className="w-36 h-36 object-contain bg-white rounded-lg border border-slate-200 shadow-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-brand-600">rocket_launch</span><h2 className="font-extrabold text-ink-900">Trial & Registrasi</h2></div>
          <label className="label" htmlFor="trial_duration_days">Durasi default trial (hari)</label>
          <input id="trial_duration_days" type="number" min={1} className="input" value={form.trial_duration_days ?? ''} onChange={(e) => set('trial_duration_days', e.target.value)} />
          <p className="text-xs text-ink-400 mt-3">Paket default registrasi saat ini: <b className="text-ink-700">{plans?.find((p) => p.isDefault)?.name ?? '—'}</b>. Ubah melalui menu Plans.</p>
        </div>

        <div className={`card p-6 transition ${maintenance ? 'ring-2 ring-amber-400/60 bg-amber-50/40' : ''}`}>
          <div className="flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-amber-600">construction</span><h2 className="font-extrabold text-ink-900">Maintenance Mode</h2></div>
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <span className="text-sm text-ink-600">Aktifkan mode maintenance untuk menandai sistem sedang dalam perbaikan.{maintenance && <b className="block text-amber-700 mt-1">Mode maintenance sedang AKTIF.</b>}</span>
            <button type="button" role="switch" aria-checked={maintenance} onClick={() => set('maintenance_mode', maintenance ? 'false' : 'true')}
              className={`relative w-12 h-7 rounded-full shrink-0 transition ${maintenance ? 'bg-amber-500' : 'bg-ink-300'}`}>
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${maintenance ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>
      </div>
    </>
  );
};
