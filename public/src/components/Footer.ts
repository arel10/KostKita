import { OWNER_ROUTES } from '../services/config';

export function renderFooter(): string {
  return `
    <footer class="bg-surface-container-low text-on-surface border-t border-surface-container-high/60 mt-auto">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          <!-- Col 1: Brand & Overview -->
          <div class="lg:col-span-2 space-y-4">
            <div class="flex items-center gap-2.5">
              <img src="/logo.png" alt="KostKita Logo" class="h-10 w-auto object-contain" />
              <span class="text-xl font-extrabold tracking-tight text-slate-900">Kost<span class="text-amber-500">Kita</span></span>
            </div>
            <p class="text-sm text-on-surface-variant max-w-sm leading-relaxed">
              Platform discovery kost terpercaya dan sistem manajemen properti kost multi-tenant terlengkap di Indonesia. Hubungkan calon penyewa langsung ke pemilik kost tanpa perantara.
            </p>
            <div class="flex items-center gap-3 pt-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span>Data Real Time & Terverifikasi</span>
              </span>
            </div>
          </div>

          <!-- Col 2: Kategori Favorit -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-on-surface tracking-wider uppercase">Kategori Kost</h4>
            <ul class="space-y-2 text-sm text-on-surface-variant">
              <li><a href="#/search?type=putri" class="hover:text-primary transition-colors flex items-center gap-1.5"> <span>Kost Khusus Putri</span></a></li>
              <li><a href="#/search?type=putra" class="hover:text-primary transition-colors flex items-center gap-1.5"> <span>Kost Khusus Putra</span></a></li>
              <li><a href="#/search?type=campur" class="hover:text-primary transition-colors flex items-center gap-1.5"> <span>Kost Campur Nyaman</span></a></li>
              <li><a href="#/search?facilities=Kamar+Mandi+Dalam" class="hover:text-primary transition-colors flex items-center gap-1.5"> <span>Kamar Mandi Dalam</span></a></li>
              <li><a href="#/search?facilities=AC" class="hover:text-primary transition-colors flex items-center gap-1.5"> <span>Kost Ber-AC & WiFi</span></a></li>
              <li><a href="#/search?priceMax=1500000" class="hover:text-primary transition-colors flex items-center gap-1.5"> <span>Budget Mahasiswa (&lt; 1.5 Jt)</span></a></li>
            </ul>
          </div>

          <!-- Col 3: Fitur Calon Penyewa -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-on-surface tracking-wider uppercase">Pencarian Cerdas</h4>
            <ul class="space-y-2 text-sm text-on-surface-variant">
              <li><a href="#/search" class="hover:text-primary transition-colors flex items-center gap-1.5">Jelajahi Peta Kost</a></li>
              <li><a href="#/search" class="hover:text-primary transition-colors flex items-center gap-1.5">Radar GPS Lokasi Saya</a></li>
              <li><a href="#/search" class="hover:text-primary transition-colors flex items-center gap-1.5">Kost Terverifikasi</a></li>
              <li><a href="#/search" class="hover:text-primary transition-colors flex items-center gap-1.5">Chat WhatsApp Langsung</a></li>
            </ul>
          </div>

          <!-- Col 4: Untuk Pemilik Kost -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold text-on-surface tracking-wider uppercase">Pemilik Kost</h4>
            <ul class="space-y-2 text-sm text-on-surface-variant">
              <li><a href="${OWNER_ROUTES.register}" class="hover:text-primary transition-colors">Daftarkan Kost Gratis</a></li>
              <li><a href="${OWNER_ROUTES.login}" class="hover:text-primary transition-colors">Dashboard Pemilik</a></li>
              <li><a href="${OWNER_ROUTES.plans}" class="hover:text-primary transition-colors">Paket Subscription</a></li>
              <li><a href="#/search" class="hover:text-primary transition-colors">Panduan Listing</a></li>
            </ul>
          </div>
        </div>

        <div class="border-t border-surface-container mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <p>© 2026 KostKita Indonesia. All rights reserved.</p>
          <div class="flex items-center gap-6">
            <span>Privasi & Keamanan</span>
            <span>Syarat & Ketentuan</span>
            <span>Bantuan WhatsApp</span>
          </div>
        </div>
      </div>
    </footer>
  `;
}
