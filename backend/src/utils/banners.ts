import prisma from '../config/database';

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  imageUrl?: string;
  targetUrl: string;
  theme: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
  ctaText?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'banner-promo-1',
    title: 'Diskon Spesial Mahasiswa & Karyawan Baru',
    subtitle: 'Dapatkan potongan biaya sewa s/d 25% dan bonus fasilitas ekstra untuk kost terverifikasi dekat kampus & pusat bisnis.',
    badgeText: 'PROMO BULAN INI',
    ctaText: 'Cari Kost Promo',
    targetUrl: '#/search',
    theme: 'blue',
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'banner-promo-2',
    title: 'Bebas Biaya Admin & Hubungi Pemilik Langsung',
    subtitle: 'Komunikasi transparan tanpa perantara via WhatsApp resmi pemilik kost. Informasi akurat, aman, dan harga sesuai aslinya.',
    badgeText: 'GARANSI 100% AMAN',
    ctaText: 'Jelajahi Kost',
    targetUrl: '#/search',
    theme: 'emerald',
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'banner-promo-3',
    title: 'Punya Usaha Kost? Maksimalkan Okupansi Kamarmu',
    subtitle: 'Daftarkan properti kostmu di platform KostKita sekarang juga. Jangkau ribuan pencari kost potensial setiap hari.',
    badgeText: 'GABUNG MITRA PEMILIK',
    ctaText: 'Daftar Sebagai Owner',
    targetUrl: 'http://localhost:5174/#/register',
    theme: 'amber',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'banner-promo-4',
    title: 'Kost Nyaman & Strategis Dekat Kampus Idaman',
    subtitle: 'Akses mudah ke transportasi umum, area kuliner, dan fasilitas belajar lengkap untuk kenyamanan studi maksimal.',
    badgeText: 'FAVORIT MAHASISWA',
    ctaText: 'Cari Dekat Kampus',
    targetUrl: '#/search',
    theme: 'emerald',
    imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function getStoredBanners(): Promise<BannerItem[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'promo_banners' },
    });
    if (!setting?.value) {
      return DEFAULT_BANNERS;
    }
    const parsed = JSON.parse(setting.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return DEFAULT_BANNERS;
  } catch (err) {
    console.error('Failed to parse promo_banners setting:', err);
    return DEFAULT_BANNERS;
  }
}

export async function saveStoredBanners(banners: BannerItem[], updatedBy?: string): Promise<void> {
  const sorted = [...banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  await prisma.systemSetting.upsert({
    where: { key: 'promo_banners' },
    update: {
      value: JSON.stringify(sorted),
      updatedBy: updatedBy || null,
    },
    create: {
      key: 'promo_banners',
      value: JSON.stringify(sorted),
      description: 'Daftar Banner Promosi Bergerak di Halaman Utama Publik',
      updatedBy: updatedBy || null,
    },
  });
}
