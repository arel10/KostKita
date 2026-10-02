import { PropertyListItem, PropertyDetail, SearchFilterParams, ApiResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1/public';

export async function fetchProperties(params: SearchFilterParams = {}): Promise<{
  data: PropertyListItem[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}> {
  const query = new URLSearchParams();

  if (params.search) query.append('search', params.search);
  if (params.city) query.append('city', params.city);
  if (params.district) query.append('district', params.district);
  if (params.type) query.append('type', params.type);
  if (params.priceMin !== undefined && params.priceMin > 0) query.append('priceMin', params.priceMin.toString());
  if (params.priceMax !== undefined && params.priceMax > 0) query.append('priceMax', params.priceMax.toString());
  if (params.availableOnly) query.append('availableOnly', 'true');
  if (params.lat !== undefined && params.lng !== undefined) {
    query.append('lat', params.lat.toString());
    query.append('lng', params.lng.toString());
  }
  if (params.radius) query.append('radius', params.radius.toString());
  if (params.page) query.append('page', params.page.toString());
  if (params.perPage) query.append('perPage', params.perPage.toString());

  if (params.facilities && params.facilities.length > 0) {
    params.facilities.forEach((f) => query.append('facilities', f));
  }

  const url = `${API_BASE}/properties?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal mengambil data properti (${res.status})`);
  }

  const json: ApiResponse<PropertyListItem[]> = await res.json();
  return {
    data: json.data || [],
    meta: json.meta || { page: 1, perPage: 10, total: 0, totalPages: 1 },
  };
}

export async function fetchPropertyDetail(slug: string, coords?: { lat: number; lng: number }): Promise<PropertyDetail> {
  let url = `${API_BASE}/properties/${encodeURIComponent(slug)}`;
  if (coords) {
    url += `?lat=${coords.lat}&lng=${coords.lng}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Properti tidak ditemukan atau sedang tidak aktif.');
    }
    throw new Error(`Gagal memuat detail kost (${res.status})`);
  }

  const json: ApiResponse<PropertyDetail> = await res.json();
  return json.data;
}

export async function submitListingReport(payload: {
  propertyId: string;
  reason: string;
  description?: string;
  reporterName?: string;
  reporterContact?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/listing-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Gagal mengirim laporan.');
  }
}

// Utility: format currency to Indonesian Rupiah
export function formatRupiah(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

// Utility: compact currency for pins (e.g. 1.250.000 -> 1,2 Jt)
export function formatCompactPrice(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';
  if (num >= 1000000) {
    const jt = (num / 1000000).toFixed(1).replace('.0', '').replace('.', ',');
    return `Rp ${jt} Jt`;
  }
  if (num >= 1000) {
    return `Rp ${(num / 1000).toFixed(0)} rb`;
  }
  return `Rp ${num}`;
}

// Utility: build WhatsApp deep link
export function buildWhatsAppLink(phone: string, propertyName: string, roomName?: string, price?: number | string): string {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }

  let text = `Halo Pemilik Kost, saya menemukan listing *${propertyName}* di KostKita.`;
  if (roomName && price) {
    text += ` Saya tertarik dengan *${roomName}* seharga *${formatRupiah(price)}/bulan*. Apakah kamar ini masih tersedia?`;
  } else {
    text += ` Apakah ada kamar kosong yang siap huni saat ini?`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
