import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../../lib/api';
import type { Plan } from '../../types';
import { PageHeader, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../context/ToastContext';

interface Feat { key: string; value: string }
const presets = [
  { key: 'max_properties', label: 'Maks. properti' },
  { key: 'max_rooms', label: 'Maks. kamar' },
  { key: 'max_tenants', label: 'Maks. penghuni aktif' },
];

export const PlanFormPage: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>(0);
  const [durationDays, setDurationDays] = useState<number | ''>(30);
  const [sortOrder, setSortOrder] = useState<number | ''>(0);
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [features, setFeatures] = useState<Feat[]>(presets.map((p) => ({ key: p.key, value: '' })));
  const [error, setError] = useState('');

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', id],
    enabled: isEdit,
    queryFn: async () => (await api.get(`/admin/plans/${id}`)).data.data as Plan,
  });

  useEffect(() => {
    if (!plan) return;
    setName(plan.name); setDescription(plan.description ?? ''); setPrice(Number(plan.price)); setDurationDays(plan.durationDays);
    setSortOrder(plan.sortOrder); setIsActive(plan.isActive); setIsDefault(plan.isDefault);
    const map = new Map(plan.features.map((f) => [f.featureKey, f.featureValue]));
    const base = presets.map((p) => ({ key: p.key, value: map.get(p.key) ?? '' }));
    const extra = plan.features.filter((f) => !presets.some((p) => p.key === f.featureKey)).map((f) => ({ key: f.featureKey, value: f.featureValue }));
    setFeatures([...base, ...extra]);
  }, [plan]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: name.trim(), description: description.trim() || undefined,
        price: Number(price), durationDays: Number(durationDays), sortOrder: Number(sortOrder || 0),
        isDefault, ...(isEdit && { isActive }),
        features: features.filter((f) => f.key.trim() && f.value.trim()).map((f) => ({ featureKey: f.key.trim(), featureValue: f.value.trim().toLowerCase() })),
      };
      return isEdit ? api.patch(`/admin/plans/${id}`, body) : api.post('/admin/plans', body);
    },
    onSuccess: () => { toast(isEdit ? 'Paket berhasil diperbarui.' : 'Paket berhasil dibuat.'); qc.invalidateQueries({ queryKey: ['plans'] }); nav('/admin/plans'); },
    onError: (e) => setError(errMsg(e, 'Gagal menyimpan paket.')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Nama paket minimal 2 karakter.');
    if (price === '' || Number(price) < 0) return setError('Harga tidak valid.');
    if (!durationDays || Number(durationDays) < 1) return setError('Durasi minimal 1 hari.');
    const bad = features.find((f) => f.key.trim() && f.value.trim() && f.value.trim().toLowerCase() !== 'unlimited' && !/^\d+$/.test(f.value.trim()));
    if (bad) return setError(`Nilai "${bad.key}" harus angka atau "unlimited".`);
    save.mutate();
  };

  if (isEdit && isLoading) return <Spinner />;
  const setF = (i: number, patch: Partial<Feat>) => setFeatures((p) => p.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  return (
    <>
      <PageHeader
        back={<Link to="/admin/plans" className="inline-flex items-center gap-1 text-xs font-bold text-ink-400 hover:text-brand-600 mb-2"><span className="material-symbols-outlined text-[16px]">arrow_back</span>Kembali ke Plans</Link>}
        title={isEdit ? 'Edit Paket' : 'Paket Baru'} subtitle="Semua benefit dan limit disimpan sebagai konfigurasi database." />

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="font-extrabold text-ink-900">Informasi Paket</h2>
            {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm ring-1 ring-rose-600/20">{error}</div>}
            <div><label className="label" htmlFor="p-name">Nama paket *</label><input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="contoh: Business" /></div>
            <div><label className="label" htmlFor="p-desc">Deskripsi</label><textarea id="p-desc" className="input min-h-[90px]" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label" htmlFor="p-price">Harga (Rp) *</label><input id="p-price" type="number" min={0} className="input" value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} /></div>
              <div><label className="label" htmlFor="p-dur">Durasi (hari) *</label><input id="p-dur" type="number" min={1} className="input" value={durationDays} onChange={(e) => setDurationDays(e.target.value === '' ? '' : Number(e.target.value))} /></div>
              <div><label className="label" htmlFor="p-sort">Urutan tampil</label><input id="p-sort" type="number" className="input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value === '' ? '' : Number(e.target.value))} /></div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-1"><h2 className="font-extrabold text-ink-900">Benefit & Limit</h2>
              <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setFeatures((p) => [...p, { key: '', value: '' }])}><span className="material-symbols-outlined text-[16px]">add</span>Tambah fitur</button></div>
            <p className="text-xs text-ink-400 mb-4">Isi angka atau <code className="px-1 rounded bg-ink-100">unlimited</code>. Kosongkan baris untuk mengabaikannya.</p>
            <div className="space-y-3">
              {features.map((f, i) => {
                const preset = presets.find((p) => p.key === f.key);
                return (
                  <div key={i} className="flex items-center gap-2">
                    {preset ? <div className="flex-1 text-sm font-semibold text-ink-700">{preset.label}<span className="block text-[11px] font-mono text-ink-400">{f.key}</span></div>
                      : <input className="input flex-1" placeholder="feature_key" value={f.key} onChange={(e) => setF(i, { key: e.target.value })} aria-label="Kunci fitur" />}
                    <input className="input !w-40" placeholder="angka / unlimited" value={f.value} onChange={(e) => setF(i, { value: e.target.value })} aria-label={`Nilai ${f.key}`} />
                    <button type="button" className={`btn-ghost !px-2 text-xs ${f.value === 'unlimited' ? '!bg-brand-50 text-brand-700' : ''}`} onClick={() => setF(i, { value: 'unlimited' })} title="Set unlimited"><span className="material-symbols-outlined text-[18px]">all_inclusive</span></button>
                    {!preset && <button type="button" className="btn-ghost !px-2 text-rose-600" onClick={() => setFeatures((p) => p.filter((_, idx) => idx !== i))} aria-label="Hapus"><span className="material-symbols-outlined text-[18px]">delete</span></button>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="font-extrabold text-ink-900">Pengaturan</h2>
            {isEdit && (
              <label className="flex items-center justify-between gap-3 cursor-pointer"><span className="text-sm font-semibold">Paket aktif</span>
                <input type="checkbox" className="w-5 h-5 accent-emerald-600" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /></label>
            )}
            <label className="flex items-start justify-between gap-3 cursor-pointer"><span className="text-sm"><b className="font-semibold">Paket default registrasi</b><span className="block text-xs text-ink-400">Diberikan otomatis ke owner baru.</span></span>
              <input type="checkbox" className="w-5 h-5 accent-emerald-600 mt-0.5" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /></label>
          </div>
          <button id="save-plan" className="btn-primary w-full !py-3" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Paket'}</button>
          <Link to="/admin/plans" className="btn-secondary w-full">Batal</Link>
        </div>
      </form>
    </>
  );
};
