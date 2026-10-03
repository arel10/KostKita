import { fetchProperties, formatRupiah } from '../services/api';
import { OWNER_ROUTES } from '../services/config';
import { PropertyListItem } from '../types';

export async function renderHomePage(): Promise<string> {
  // Fetch real properties from backend
  let properties: PropertyListItem[] = [];
  try {
    const res = await fetchProperties({ perPage: 50 });
    properties = res.data;
  } catch (e) {
    console.error('Failed to load properties for homepage:', e);
  }

  // 4 Featured properties for the showcase section
  const featured = properties.slice(0, 4);

  // Extract REAL active cities dynamically from database
  const cityMap: Record<string, { count: number; rawCity: string; minPrice: number }> = {};
  properties.forEach((p) => {
    if (p.city) {
      const cleanName = p.city.replace(/^(Kota|Kabupaten)\s+/i, '').trim();
      const numPrice = Number(p.priceStart) || 0;
      if (!cityMap[cleanName]) {
        cityMap[cleanName] = {
          count: 0,
          rawCity: p.city,
          minPrice: numPrice,
        };
      }
      cityMap[cleanName].count += 1;
      if (numPrice < cityMap[cleanName].minPrice) {
        cityMap[cleanName].minPrice = numPrice;
      }
    }
  });

  const realActiveCities = Object.entries(cityMap).map(([name, info]) => ({
    name,
    rawCity: info.rawCity,
    count: info.count,
    minPrice: info.minPrice,
  }));

  return `
    <div class="flex flex-col w-full">
      <!-- HERO SECTION -->
      <section class="relative w-full overflow-hidden bg-gradient-to-b from-surface-container-low via-surface to-background pb-16 pt-8">
        <!-- Ambient Background Glows -->
        <div class="absolute -top-32 right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 left-[-15%] w-[420px] h-[420px] rounded-full bg-surface-variant/30 blur-3xl pointer-events-none"></div>

        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-14 pb-8 relative z-10">
          <div class="flex flex-col items-center text-center max-w-4xl mx-auto mb-10">
            <!-- Verified Tracker Pill -->
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-sm border border-surface-container-high/60 mb-6">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-xs font-semibold text-primary tracking-wide">
                KostKita Discovery • Terhubung Langsung ke Pemilik Kost
              </span>
            </div>

            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-on-surface tracking-tight mb-4 leading-tight">
              Temukan Kost Nyaman <br class="hidden sm:inline"/>
              <span class="text-primary relative inline-block">
                yang Pas untukmu.
                <svg class="absolute -bottom-2 left-0 w-full h-3 text-secondary-container/60" fill="none" preserveAspectRatio="none" viewBox="0 0 200 12">
                  <path d="M2 9C58 3 142 3 198 9" stroke="currentColor" stroke-linecap="round" stroke-width="4"></path>
                </svg>
              </span>
            </h1>

            <p class="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto mb-8 font-normal">
              Cari ribuan pilihan kost terverifikasi di berbagai kota Indonesia. Hubungi pemilik kost langsung via WhatsApp tanpa perantara dan tanpa biaya admin.
            </p>

            <!-- Trust Mini Badges -->
            <div class="flex flex-wrap items-center justify-center gap-3">
              <div class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-surface-container text-on-surface text-xs font-medium shadow-sm">
                <span class="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                <span>Informasi Terverifikasi</span>
              </div>
              <div class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-surface-container text-on-surface text-xs font-medium shadow-sm">
                <span class="material-symbols-outlined text-primary text-[18px]">money_off</span>
                <span>Tanpa Biaya Admin</span>
              </div>
              <div class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-surface-container text-on-surface text-xs font-medium shadow-sm">
                <span class="material-symbols-outlined text-[#25D366] text-[18px]">chat</span>
                <span>Hubungi Langsung via WhatsApp</span>
              </div>
            </div>
          </div>

          <!-- MAIN SEARCH DOCK -->
          <div class="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl shadow-primary/5 border border-surface-container-high/60 p-4 sm:p-6">
            <form id="heroSearchForm" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <!-- Location / Keyword Input -->
              <div class="md:col-span-5 relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[22px]">search</span>
                <input 
                  type="text" 
                  id="heroInputSearch"
                  placeholder="Kota, kampus, atau area (cth: Padang, UGM, UI, Tebet)"
                  class="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary transition-all font-sans"
                />
              </div>

              <!-- GPS Trigger Button -->
              <div class="md:col-span-3">
                <button 
                  type="button" 
                  id="btnHeroGps"
                  class="w-full h-12 px-3 flex items-center justify-center gap-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-semibold text-xs sm:text-sm border border-surface-container transition-colors"
                >
                  <span class="material-symbols-outlined text-primary text-[20px]">near_me</span>
                  <span id="heroGpsText">Gunakan Lokasi Saya</span>
                </button>
              </div>

              <!-- Price Filter -->
              <div class="md:col-span-2 relative">
                <select 
                  id="heroPriceRange"
                  class="w-full h-12 px-3 pr-8 rounded-xl bg-surface-container-low text-on-surface text-xs sm:text-sm border border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer font-sans"
                >
                  <option value="">Semua Harga</option>
                  <option value="under-1500k">&lt; Rp 1.5 Jt</option>
                  <option value="1500k-2500k">Rp 1.5 - 2.5 Jt</option>
                  <option value="above-2500k">&gt; Rp 2.5 Jt</option>
                </select>
                <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-[20px]">expand_more</span>
              </div>

              <!-- Submit CTA -->
              <div class="md:col-span-2">
                <button 
                  type="submit" 
                  class="w-full h-12 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Cari Kost</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </form>

            <!-- Quick Filter Tags -->
            <div class="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-surface-container-low text-xs text-on-surface-variant font-medium">
              <span class="text-outline">Kategori Populer:</span>
              <a href="#/search?type=putri" class="px-3 py-1 rounded-lg bg-surface-container-low hover:bg-rose-50 hover:text-rose-700 transition-colors text-on-surface font-semibold">Kost Putri</a>
              <a href="#/search?type=putra" class="px-3 py-1 rounded-lg bg-surface-container-low hover:bg-blue-50 hover:text-blue-700 transition-colors text-on-surface font-semibold">Kost Putra</a>
              <a href="#/search?type=campur" class="px-3 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface font-semibold">Kost Campur</a>
              <a href="#/search?facilities=Kamar+Mandi+Dalam" class="px-3 py-1 rounded-lg bg-surface-container-low hover:bg-purple-50 hover:text-purple-700 transition-colors text-on-surface font-semibold">Kamar Mandi Dalam</a>
              <a href="#/search?facilities=AC" class="px-3 py-1 rounded-lg bg-surface-container-low hover:bg-cyan-50 hover:text-cyan-700 transition-colors text-on-surface font-semibold">Ber-AC & WiFi</a>
              <a href="#/search?priceMax=1500000" class="px-3 py-1 rounded-lg bg-surface-container-low hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-on-surface font-semibold">Budget &lt; 1.5 Jt</a>
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURED REAL PROPERTIES -->
      <section class="w-full bg-surface-container-low/60 py-16 border-y border-surface-container">
        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div class="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-1.5">
                <span class="w-3 h-1 bg-primary rounded-full"></span>
                <span>Pilihan Terbaik</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">Rekomendasi Kost Terverifikasi</h2>
            </div>
            <a href="#/search" class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <span>Jelajahi Semua Kost</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </a>
          </div>

          <!-- Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${
              featured.length > 0
                ? featured
                    .map((item) => {
                      const primaryPhoto =
                        item.photos?.find((p) => p.isPrimary)?.url ||
                        item.photos?.[0]?.url ||
                        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

                      const typeLabel =
                        item.type === 'putri'
                          ? 'Kost Putri'
                          : item.type === 'putra'
                          ? 'Kost Putra'
                          : 'Kost Campur';

                      const typeBadgeClass =
                        item.type === 'putri'
                          ? 'bg-rose-100 text-rose-800'
                          : item.type === 'putra'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800';

                      return `
                        <div class="bg-white rounded-2xl overflow-hidden border border-surface-container-high/60 shadow-sm hover:shadow-card transition-all flex flex-col group">
                          <!-- Photo -->
                          <div class="relative h-48 overflow-hidden bg-surface-container">
                            <img 
                              src="${primaryPhoto}" 
                              alt="${item.name}" 
                              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div class="absolute top-3 left-3 flex items-center gap-1.5">
                              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${typeBadgeClass} shadow-sm backdrop-blur-md">
                                ${typeLabel}
                              </span>
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white shadow-sm flex items-center gap-0.5">
                                <span class="material-symbols-outlined text-[12px]">verified</span>
                                <span>Verifikasi</span>
                              </span>
                            </div>
                          </div>

                          <!-- Details -->
                          <div class="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <div class="flex items-center gap-1 text-xs text-on-surface-variant mb-1">
                                <span class="material-symbols-outlined text-[15px] text-primary">location_on</span>
                                <span>${item.district || ''}, ${item.city || ''}</span>
                              </div>
                              <h3 class="font-bold text-base text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                                <a href="#/kost/${item.slug}">${item.name}</a>
                              </h3>

                              <!-- Facilities chips -->
                              <div class="flex flex-wrap gap-1 mt-3">
                                ${item.facilities
                                  .slice(0, 3)
                                  .map(
                                    (f) =>
                                      `<span class="px-2 py-0.5 rounded bg-surface-container-low text-[11px] text-on-surface-variant font-medium">${f.facilityName}</span>`
                                  )
                                  .join('')}
                              </div>
                            </div>

                            <!-- Price & Action -->
                            <div class="border-t border-surface-container-low pt-4 mt-4 flex items-center justify-between">
                              <div>
                                <span class="text-[11px] text-outline block">Mulai dari</span>
                                <span class="text-base font-bold text-primary font-sans">${formatRupiah(item.priceStart)}</span>
                                <span class="text-[11px] text-outline">/bln</span>
                              </div>
                              <a 
                                href="#/kost/${item.slug}"
                                class="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-primary hover:text-white text-primary text-xs font-semibold transition-colors"
                              >
                                Detail
                              </a>
                            </div>
                          </div>
                        </div>
                      `;
                    })
                    .join('')
                : `
                  <div class="col-span-full py-12 text-center text-on-surface-variant">
                    <p>Sedang memuat rekomendasi kost terbaru...</p>
                  </div>
                `
            }
          </div>
        </div>
      </section>

      <!-- WHY KOSTKITA VALUE PROPS -->
      <section class="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <div class="flex items-center justify-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-1.5">
            <span class="w-3 h-1 bg-primary rounded-full"></span>
            <span>Keunggulan Platform</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">Kenapa Cari Kost di KostKita?</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white p-8 rounded-2xl border border-surface-container-high/60 shadow-sm flex flex-col items-center text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary mb-5 shadow-sm">
              <span class="material-symbols-outlined text-[30px]">chat</span>
            </div>
            <h3 class="text-lg font-bold text-on-surface mb-2">Langsung ke Pemilik Kost</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              Tanya ketersediaan kamar dan negosiasi langsung ke nomor WhatsApp resmi pemilik kost tanpa melalui agen atau calo.
            </p>
          </div>

          <div class="bg-white p-8 rounded-2xl border border-surface-container-high/60 shadow-sm flex flex-col items-center text-center">
            <div class="w-14 h-14 rounded-2xl bg-secondary-fixed flex items-center justify-center text-secondary mb-5 shadow-sm">
              <span class="material-symbols-outlined text-[30px]">map</span>
            </div>
            <h3 class="text-lg font-bold text-on-surface mb-2">Peta Interaktif & Akurat</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              Lihat lokasi kost secara geografis di peta, cek estimasi jarak ke kampus atau kantor impianmu dengan fitur GPS real-time.
            </p>
          </div>

          <div class="bg-white p-8 rounded-2xl border border-surface-container-high/60 shadow-sm flex flex-col items-center text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary mb-5 shadow-sm">
              <span class="material-symbols-outlined text-[30px]">verified</span>
            </div>
            <h3 class="text-lg font-bold text-on-surface mb-2">Transparan & Terverifikasi</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              Foto kamar asli, rincian fasilitas lengkap, serta harga sewa transparan tanpa ada biaya tersembunyi yang merugikan.
            </p>
          </div>
        </div>
      </section>

      <!-- OWNER CTA BANNER -->
      <section class="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div class="relative bg-gradient-to-r from-primary via-primary-container to-primary rounded-3xl p-8 sm:p-12 text-white overflow-hidden shadow-xl">
          <div class="relative z-10 max-w-2xl">
            <span class="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase inline-block mb-4">
              Untuk Pemilik Properti Kost
            </span>
            <h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
              Punya Bisnis Kost? Kelola Otomatis & Pasang Listing Gratis.
            </h2>
            <p class="text-sm sm:text-base text-white/90 mb-8 leading-relaxed font-normal">
              KostKita menyediakan software SaaS manajemen penghuni, tagihan otomatis via WhatsApp, laporan keuangan, dan listing publik agar kamar kostmu cepat terisi penuh.
            </p>
            <div class="flex flex-wrap items-center gap-4">
              <a 
                href="${OWNER_ROUTES.register}" 
                class="px-6 py-3 rounded-xl bg-white text-primary font-bold text-sm hover:bg-surface-container-low transition-colors shadow-md"
              >
                Mulai Trial Gratis 30 Hari
              </a>
              <a 
                href="${OWNER_ROUTES.login}" 
                class="px-6 py-3 rounded-xl bg-primary/40 hover:bg-primary/60 border border-white/30 text-white font-semibold text-sm transition-colors"
              >
                Masuk ke Dashboard
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

export function setupHomePageEvents() {
  const form = document.getElementById('heroSearchForm') as HTMLFormElement;
  const input = document.getElementById('heroInputSearch') as HTMLInputElement;
  const priceSelect = document.getElementById('heroPriceRange') as HTMLSelectElement;
  const btnGps = document.getElementById('btnHeroGps') as HTMLButtonElement;
  const gpsText = document.getElementById('heroGpsText');

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const searchVal = input?.value.trim() || '';
      const priceVal = priceSelect?.value || '';

      const queryParams = new URLSearchParams();
      if (searchVal) queryParams.set('search', searchVal);

      if (priceVal === 'under-1500k') {
        queryParams.set('priceMax', '1500000');
      } else if (priceVal === '1500k-2500k') {
        queryParams.set('priceMin', '1500000');
        queryParams.set('priceMax', '2500000');
      } else if (priceVal === 'above-2500k') {
        queryParams.set('priceMin', '2500000');
      }

      window.location.hash = `#/search?${queryParams.toString()}`;
    };
  }

  if (btnGps) {
    btnGps.onclick = () => {
      if (!navigator.geolocation) {
        alert('Browser Anda tidak mendukung deteksi lokasi GPS.');
        return;
      }

      if (gpsText) gpsText.textContent = 'Mendeteksi...';
      btnGps.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          window.location.hash = `#/search?lat=${lat}&lng=${lng}&radius=20`;
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Izin akses lokasi tidak diberikan atau GPS tidak aktif.');
          if (gpsText) gpsText.textContent = 'Gunakan Lokasi Saya';
          btnGps.disabled = false;
        },
        { timeout: 10000 }
      );
    };
  }
}
