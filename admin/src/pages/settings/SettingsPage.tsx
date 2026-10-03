import React, { useEffect, useState } from 'react';
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
  { title: 'Rekening Pembayaran Subscription', icon: 'account_balance', fields: [
    { key: 'payment_bank_name', label: 'Nama bank' },
    { key: 'payment_account_number', label: 'Nomor rekening' },
    { key: 'payment_account_name', label: 'Atas nama' },
  ] },
];

export const SettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<S>({});

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get('/admin/settings')).data.data as S });
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get('/admin/plans')).data.data as Plan[] });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: () => api.patch('/admin/settings', form),
    onSuccess: () => { toast('Pengaturan berhasil disimpan.'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });

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
            <div className="flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-brand-600">{s.icon}</span><h2 className="font-extrabold text-ink-900">{s.title}</h2></div>
            <div className="space-y-4">
              {s.fields.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={f.key}>{f.label}</label>
                  <input id={f.key} type={f.type ?? 'text'} className="input" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                  {f.hint && <p className="text-[11px] text-ink-400 mt-1">{f.hint}</p>}
                </div>
              ))}
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
