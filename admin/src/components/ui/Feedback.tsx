import React from 'react';
import type { PageMeta } from '../../types';

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Memuat data…' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-ink-400">
    <span className="w-8 h-8 rounded-full border-[3px] border-brand-200 border-t-brand-600 animate-spin" />
    <span className="text-xs font-medium">{label}</span>
  </div>
);

export const EmptyState: React.FC<{ icon?: string; title: string; description?: string }> = ({ icon = 'inbox', title, description }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-400 flex items-center justify-center mb-3">
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
    </div>
    <p className="text-sm font-bold text-ink-700">{title}</p>
    {description && <p className="text-xs text-ink-400 mt-1 max-w-xs">{description}</p>}
  </div>
);

const tones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  gray: 'bg-ink-100 text-ink-600 ring-ink-500/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

const map: Record<string, [string, string]> = {
  active: ['Aktif', 'green'],
  approved: ['Disetujui', 'green'],
  resolved: ['Selesai', 'green'],
  trial: ['Trial', 'blue'],
  pending: ['Menunggu', 'amber'],
  draft: ['Draft', 'gray'],
  expiring_soon: ['Segera Berakhir', 'amber'],
  reviewed: ['Ditinjau', 'blue'],
  suspended: ['Disuspend', 'red'],
  rejected: ['Ditolak', 'red'],
  expired: ['Kedaluwarsa', 'red'],
  inactive: ['Nonaktif', 'gray'],
  deactivated: ['Dinonaktifkan', 'gray'],
  cancelled: ['Dibatalkan', 'gray'],
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const [label, tone] = map[status] ?? [status, 'gray'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ${tones[tone]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

export const Pill: React.FC<{ tone?: keyof typeof tones; children: React.ReactNode }> = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ${tones[tone]}`}>{children}</span>
);

interface StatProps { label: string; value: React.ReactNode; icon: string; tone?: 'brand' | 'amber' | 'rose' | 'sky' | 'violet'; hint?: string; delay?: number }
const statTone = {
  brand: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-400 to-orange-500',
  rose: 'from-rose-500 to-pink-600',
  sky: 'from-sky-500 to-indigo-500',
  violet: 'from-violet-500 to-purple-600',
};

export const StatCard: React.FC<StatProps> = ({ label, value, icon, tone = 'brand', hint, delay = 0 }) => (
  <div className="card p-5 flex items-start gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${statTone[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-ink-900 mt-0.5 truncate">{value}</p>
      {hint && <p className="text-xs text-ink-400 mt-0.5">{hint}</p>}
    </div>
  </div>
);

export const Pagination: React.FC<{ meta?: PageMeta; onChange: (p: number) => void }> = ({ meta, onChange }) => {
  if (!meta || meta.totalPages <= 1) {
    return meta ? <div className="px-4 py-3 text-xs text-ink-400 border-t border-ink-100">{meta.total} data</div> : null;
  }
  const { page, totalPages, total, perPage } = meta;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100">
      <p className="text-xs text-ink-500">Menampilkan {from}–{to} dari {total}</p>
      <div className="flex items-center gap-1">
        <button className="btn-ghost !px-2 !py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Sebelumnya">
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span className="text-xs font-bold text-ink-700 px-2">{page} / {totalPages}</span>
        <button className="btn-ghost !px-2 !py-1.5" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Berikutnya">
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode; back?: React.ReactNode }> = ({ title, subtitle, actions, back }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
    <div>
      {back}
      <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = 'Cari…' }) => (
  <div className="relative flex-1 min-w-[200px]">
    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-[20px]">search</span>
    <input className="input !pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  </div>
);

export const Select: React.FC<{ value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }> = ({ value, onChange, options, label }) => (
  <select className="input !w-auto min-w-[150px]" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const Avatar: React.FC<{ name?: string; size?: number }> = ({ name, size = 36 }) => {
  const letters = (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <div className="rounded-full bg-gradient-to-br from-brand-400 to-teal-600 text-white font-bold flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {letters}
    </div>
  );
};
