export const rupiah = (n: number | string | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const compactRupiah = (n: number) =>
  n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} jt` : n >= 1000 ? `Rp ${Math.round(n / 1000)} rb` : `Rp ${n}`;

export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d?: string | Date | null) =>
  d
    ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export const daysLeft = (d?: string | Date | null) =>
  d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000) : 0;

export const timeAgo = (d: string | Date) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 2_592_000) return `${Math.floor(s / 86400)} hari lalu`;
  return fmtDate(d);
};

export const initials = (name?: string) =>
  (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export const API_ORIGIN = '';
export const assetUrl = (u?: string | null) => (!u ? '' : u.startsWith('http') ? u : `${API_ORIGIN}${u}`);
