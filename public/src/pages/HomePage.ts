import { fetchProperties, formatRupiah, fetchBanners, PromoBanner } from '../services/api';
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

  // Fetch banners from backend
  let banners: PromoBanner[] = [];
  try {
    banners = await fetchBanners();
  } catch (e) {
    console.error('Failed to load banners:', e);
  }

  const defaultBannersFallback: PromoBanner[] = [
    {
      id: 'b1',
      title: 'Diskon Spesial Mahasiswa & Karyawan Baru',
      subtitle: 'Dapatkan potongan biaya sewa s/d 25% dan bonus fasilitas ekstra untuk kost terverifikasi dekat kampus & pusat bisnis.',
      badgeText: 'PROMO BULAN INI',
      ctaText: 'Cari Kost Promo',
      targetUrl: '#/search',
      theme: 'emerald',
      isActive: true,
      order: 1,
    },
    {
      id: 'b2',
      title: 'Bebas Biaya Admin & Hubungi Pemilik Langsung',
      subtitle: 'Komunikasi transparan tanpa perantara via WhatsApp resmi pemilik kost. Informasi akurat, aman, dan harga sesuai aslinya.',
      badgeText: 'GARANSI 100% AMAN',
      ctaText: 'Jelajahi Kost',
      targetUrl: '#/search',
      theme: 'emerald',
      isActive: true,
      order: 2,
    },
    {
      id: 'b3',
      title: 'Punya Usaha Kost? Maksimalkan Okupansi Kamarmu',
      subtitle: 'Daftarkan properti kostmu di platform KostKita sekarang juga. Jangkau ribuan pencari kost potensial setiap hari.',
      badgeText: 'GABUNG MITRA PEMILIK',
      ctaText: 'Daftar Sebagai Owner',
      targetUrl: 'http://localhost:5174/#/register',
      theme: 'amber',
      isActive: true,
      order: 3,
    },
    {
      id: 'b4',
      title: 'Kost Nyaman & Strategis Dekat Kampus Idaman',
      subtitle: 'Akses mudah ke transportasi umum, area kuliner, dan fasilitas belajar lengkap untuk kenyamanan studi maksimal.',
      badgeText: 'FAVORIT MAHASISWA',
      ctaText: 'Cari Dekat Kampus',
      targetUrl: '#/search',
      theme: 'emerald',
      isActive: true,
      order: 4,
    },
  ];

  const activeBanners = banners.length > 0 ? banners : defaultBannersFallback;

  // 4 Featured properties for the showcase section
  const featured = properties.slice(0, 4);

  return `
    <div class="flex flex-col w-full bg-white">
      <!-- HERO SECTION: LAYERED CURVED SHAPES (BULAT BERLAPIS) + SOFT FADE -->
      <section class="relative z-0 w-full pt-8 sm:pt-12 pb-14 sm:pb-18">

        <!-- Background layer: extends 200px below the hero and fades out via mask (no hard edge) -->
        <div
          class="absolute inset-x-0 top-0 h-[calc(100%+200px)] overflow-hidden pointer-events-none"
          style="background: linear-gradient(160deg, #eaf4ee 0%, #f1f8f4 55%, #f6faf8 100%); -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0.5) 80%, transparent 100%); mask-image: linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0.5) 80%, transparent 100%);"
        >
          <!-- Kiri bawah: gelombang (terang) + seperempat lingkaran (lebih gelap) -->
          <svg class="absolute left-0 bottom-[120px] w-[720px] h-[720px] max-w-[70vw]" viewBox="0 0 720 720" preserveAspectRatio="xMinYMax meet" fill="none">
            <defs>
              <linearGradient id="heroWave" x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0%" stop-color="#e3efe8" />
                <stop offset="100%" stop-color="#edf5f0" />
              </linearGradient>
              <linearGradient id="heroCircle" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#d3e6da" />
                <stop offset="100%" stop-color="#e0eee5" />
              </linearGradient>
            </defs>
            <path d="M0 90 C 150 60, 250 170, 320 320 C 390 470, 470 600, 640 720 L 0 720 Z" fill="url(#heroWave)" />
            <circle cx="0" cy="720" r="400" fill="url(#heroCircle)" />
          </svg>

          <!-- Kanan atas: lingkaran besar lembut (aksen penyeimbang) -->
          <svg class="absolute right-0 top-0 w-[560px] h-[560px] max-w-[55vw]" viewBox="0 0 560 560" preserveAspectRatio="xMaxYMin meet" fill="none">
            <defs>
              <linearGradient id="heroTopRight" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#d9eadf" />
                <stop offset="100%" stop-color="#eaf4ee" />
              </linearGradient>
            </defs>
            <circle cx="560" cy="0" r="360" fill="url(#heroTopRight)" />
            <circle cx="560" cy="0" r="220" fill="#d1e5d8" fill-opacity="0.55" />
          </svg>
        </div>

        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <!-- Top Row: Pitch & Bedroom Frame -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-10 sm:mb-14">
            
            <!-- Left Column: Title, Verification Badge & Trust Badges -->
            <div class="lg:col-span-7 flex flex-col text-left">
              <!-- Official Verification Pill (Stacked text) -->
              <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-emerald-300/50 shadow-xs mb-6 w-fit">
                <span class="material-symbols-outlined text-[#004337] text-[20px]">check_circle</span>
                <div class="flex flex-col text-left leading-tight">
                  <span class="text-[10px] font-black text-[#004337] tracking-wider uppercase">VERIFIKASI RESMI</span>
                  <span class="text-[9px] font-semibold text-slate-500">100% Bebas Penipuan</span>
                </div>
              </div>

              <!-- Main Title -->
              <h1 class="text-4xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.12] mb-4">
                Temukan Kost Nyaman<br/>
                <span class="text-[#004337]">yang Pas untukmu.</span>
              </h1>

              <!-- Subtitle -->
              <p class="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl mb-7">
                Cari ribuan pilihan kost terverifikasi di berbagai kota Indonesia. Hubungi pemilik kost langsung via WhatsApp tanpa perantara dan tanpa biaya admin.
              </p>

              <!-- 3 Trust Badges (Pill Shape) -->
              <div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xs text-xs font-semibold text-slate-700">
                  <span class="material-symbols-outlined text-slate-700 text-[18px]">verified_user</span>
                  <span>Informasi Terverifikasi</span>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xs text-xs font-semibold text-slate-700">
                  <span class="material-symbols-outlined text-slate-700 text-[18px]">person</span>
                  <span>Tanpa Biaya Admin</span>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xs text-xs font-semibold text-slate-700">
                  <span class="material-symbols-outlined text-[#25D366] text-[18px]">chat</span>
                  <span>Hubungi Langsung via WhatsApp</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Premium Room Showcase -->
            <div class="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
              <div class="relative w-full max-w-[480px]">
                
                <!-- Ambient Glow Backdrop -->
                <div class="absolute -inset-4 sm:-inset-6 bg-gradient-to-tr from-emerald-400/25 via-[#004337]/15 to-amber-300/25 rounded-[44px] blur-2xl -z-10 pointer-events-none"></div>

                <!-- Organic Solid Decorative Rings -->
                <svg class="absolute -right-8 -bottom-8 w-[125%] h-[125%] pointer-events-none text-emerald-900/10 z-0" viewBox="0 0 460 380" fill="none">
                  <path d="M 60 40 C -10 120, -5 260, 70 330 C 180 390, 360 380, 440 330" stroke="currentColor" stroke-width="2" stroke-dasharray="6 6" stroke-linecap="round" />
                </svg>

                <!-- Floating Top-Right Badge: Platform Verification -->
                <div class="absolute -top-4 -right-2 sm:-right-4 z-30 animate-float-slow flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_24px_rgba(0,0,0,0.08)] transition-transform hover:scale-105 cursor-default">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-xs font-bold text-slate-800">Pilihan Terverifikasi</span>
                </div>

                <!-- Main Photo Card Container -->
                <div class="relative z-10 rounded-[32px] sm:rounded-[38px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,67,55,0.22)] border-[5px] border-white aspect-[4/3] bg-slate-100 group">
                  <img 
                    src="/hero-room.jpg" 
                    alt="Kamar Kost Nyaman KostKita" 
                    class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <!-- Inner subtle vignette gradient overlay -->
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-black/5 pointer-events-none"></div>
                </div>

                <!-- Floating Bottom-Left Card: Platform Discovery -->
                <div class="absolute -bottom-5 -left-2 sm:-left-5 z-30 animate-float-reverse flex items-center gap-3 px-4 sm:px-5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_14px_30px_rgba(0,67,55,0.14)] transition-transform hover:scale-105 cursor-default">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-[#004337] shrink-0 shadow-inner">
                    <span class="material-symbols-outlined text-[20px]">explore</span>
                  </div>
                  <div class="flex flex-col text-left">
                    <span class="text-xs font-bold text-slate-900">Eksplorasi Ribuan Kost</span>
                    <span class="text-[10px] text-slate-500 font-medium">Banyak pilihan di sekitar lokasimu</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          <!-- Bottom Row: Elevated Pill Search Bar & Quick Categories (Integrated inside the soft gradient flow) -->
          <div class="w-full relative z-20">
            <!-- Elevated Pill Search Bar -->
            <div class="w-full max-w-5xl mx-auto bg-white rounded-3xl sm:rounded-full shadow-[0_12px_36px_rgba(0,67,55,0.08)] border border-slate-200/80 p-2 sm:p-2.5">
              <form id="heroSearchForm" class="flex flex-col md:flex-row items-center gap-2 sm:gap-3">
                
                <!-- Location Input -->
                <div class="flex-1 w-full relative flex items-center pl-3">
                  <span class="material-symbols-outlined text-slate-400 text-[20px] mr-2">location_on</span>
                  <input 
                    type="text" 
                    id="heroInputSearch"
                    placeholder="Kota, kampus, atau area (cth: Padang, UGM, UI, ..)"
                    class="w-full h-11 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none font-sans"
                  />
                </div>

                <!-- Divider -->
                <div class="hidden md:block w-px h-8 bg-slate-200"></div>

                <!-- GPS Button -->
                <button 
                  type="button" 
                  id="btnHeroGps"
                  class="h-11 px-4 flex items-center justify-center gap-1.5 rounded-full bg-[#edf5f2] hover:bg-[#e2efe9] text-[#004337] font-bold text-xs border border-emerald-200/40 transition-all shrink-0 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[#004337] text-[18px]">near_me</span>
                  <span id="heroGpsText">Gunakan Lokasi Saya</span>
                </button>

                <!-- Divider -->
                <div class="hidden md:block w-px h-8 bg-slate-200"></div>

                <!-- Price Dropdown -->
                <div class="relative shrink-0 w-full md:w-auto">
                  <select 
                    id="heroPriceRange"
                    class="w-full md:w-auto h-11 pl-3 pr-8 rounded-full bg-transparent text-slate-700 text-xs sm:text-sm focus:outline-none appearance-none cursor-pointer font-sans"
                  >
                    <option value="">Semua Harga</option>
                    <option value="under-1500k">&lt; Rp 1,5 Jt</option>
                    <option value="1500k-2500k">Rp 1,5 - 2,5 Jt</option>
                    <option value="above-2500k">&gt; Rp 2,5 Jt</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
                </div>

                <!-- Submit CTA -->
                <button 
                  type="submit" 
                  class="h-11 px-6 rounded-full bg-[#004337] hover:bg-[#00342b] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all shrink-0 w-full md:w-auto cursor-pointer"
                >
                  <span>Cari Kost</span>
                  <span class="material-symbols-outlined text-[17px]">arrow_forward</span>
                </button>
              </form>
            </div>

            <!-- Quick Filter Tags -->
            <div class="flex flex-wrap items-center justify-center gap-2 max-w-5xl mx-auto mt-4 px-2 text-xs">
              <span class="text-slate-500 font-bold uppercase text-[11px] tracking-wider mr-1">KATEGORI CEPAT:</span>
              <a href="#/search?type=putri" class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 shadow-2xs hover:border-[#004337] hover:text-[#004337] transition-all">Kost Putri</a>
              <a href="#/search?type=putra" class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 shadow-2xs hover:border-[#004337] hover:text-[#004337] transition-all">Kost Putra</a>
              <a href="#/search?type=campur" class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 shadow-2xs hover:border-[#004337] hover:text-[#004337] transition-all">Kost Campur</a>
              <a href="#/search?facilities=Kamar+Mandi+Dalam" class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 shadow-2xs hover:border-[#004337] hover:text-[#004337] transition-all">Kamar Mandi Dalam</a>
              <a href="#/search?facilities=AC" class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 shadow-2xs hover:border-[#004337] hover:text-[#004337] transition-all">Ber-AC & WiFi</a>
              <a href="#/search?priceMax=1500000" class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 shadow-2xs hover:border-[#004337] hover:text-[#004337] transition-all">Budget &lt; 1,5 Jt</a>
            </div>
          </div>

        </div>
      </section>

      <!-- FEATURED REAL PROPERTIES (REKOMENDASI KOST TERVERIFIKASI) -->
      <section class="relative z-10 w-full bg-transparent py-10">
        <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div class="flex items-center gap-2 text-xs font-bold text-[#004337] uppercase tracking-widest mb-1.5">
                <span>— PILIHAN TERBAIK</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Rekomendasi Kost Terverifikasi</h2>
            </div>
            <a href="#/search" class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#004337] hover:underline">
              <span>Jelajahi Semua Kost</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </a>
          </div>

          <!-- Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${featured.length > 0
      ? featured
        .map((item) => {
          const rawPhoto =
            item.photos?.find((p) => p.isPrimary)?.url ||
            item.photos?.[0]?.url;
          const primaryPhoto =
            !rawPhoto || rawPhoto.includes('unsplash.com')
              ? '/property-placeholder.svg'
              : rawPhoto;

          const typeLabel =
            item.type === 'putri'
              ? 'Kost Putri'
              : item.type === 'putra'
                ? 'Kost Putra'
                : 'Kost Campur';

          const typeBadgeClass =
            item.type === 'putri'
              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
              : item.type === 'putra'
                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60';

          return `
                      <div class="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-card transition-all flex flex-col group">
                        <!-- Photo with Top Badges -->
                        <div class="relative h-48 overflow-hidden bg-slate-100">
                          <img 
                            src="${primaryPhoto}" 
                            alt="${item.name}" 
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div class="absolute top-3 left-3 flex items-center gap-1.5">
                            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${typeBadgeClass} shadow-xs backdrop-blur-md">
                              ${typeLabel}
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#004337] text-white shadow-xs flex items-center gap-0.5">
                              <span class="material-symbols-outlined text-[12px]">verified</span>
                              <span>Verifikasi</span>
                            </span>
                          </div>
                        </div>

                        <!-- Details -->
                        <div class="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div class="flex items-center gap-1 text-xs text-slate-500 mb-1">
                              <span class="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                              <span>${item.district || ''}, ${item.city || ''}</span>
                            </div>
                            <h3 class="font-bold text-base text-slate-900 group-hover:text-[#004337] transition-colors line-clamp-1">
                              <a href="#/kost/${item.slug}">${item.name}</a>
                            </h3>

                            <!-- Facilities chips -->
                            <div class="flex flex-wrap gap-1 mt-3">
                              ${item.facilities
              .slice(0, 3)
              .map(
                (f) =>
                  `<span class="px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-medium">${f.facilityName}</span>`
              )
              .join('')}
                            </div>
                          </div>

                          <!-- Price & Action -->
                          <div class="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between">
                            <div>
                              <span class="text-[11px] text-slate-400 block">Mulai dari</span>
                              <span class="text-base font-bold text-[#004337] font-sans">${formatRupiah(item.priceStart)}</span>
                              <span class="text-[11px] text-slate-400">/bln</span>
                            </div>
                            <a 
                              href="#/kost/${item.slug}"
                              class="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-[#004337] hover:text-white text-slate-700 text-xs font-semibold transition-colors"
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
                  <div class="col-span-full py-12 text-center text-slate-500">
                    <p>Sedang memuat rekomendasi kost terbaru...</p>
                  </div>
                `
    }
          </div>
        </div>
      </section>

      <!-- GLOBAL PROMO BANNER CAROUSEL (POSITIONED UNDER REKOMENDASI KOST) -->
      <section class="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="relative overflow-hidden rounded-[28px] shadow-2xl group border border-slate-200/40 bg-slate-900" id="promoCarouselContainer">
          
          <!-- Top Right Controls: Slide Counter & Nav Buttons -->
          <div class="absolute top-5 sm:top-6 right-5 sm:right-6 z-30 flex items-center gap-2.5">
            <span id="bannerSlideCounter" class="text-xs font-semibold text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 shadow-sm">
              1 dari ${activeBanners.length}
            </span>
            <div class="flex items-center gap-1.5">
              <button 
                id="carouselPrevBtn" 
                aria-label="Banner Sebelumnya" 
                class="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-sm active:scale-90 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button 
                id="carouselNextBtn" 
                aria-label="Banner Berikutnya" 
                class="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-sm active:scale-90 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- Slides Track (Clean Dark Neutral Aesthetic - No Green Tint) -->
          <div id="promoCarouselTrack" class="flex transition-transform duration-700 ease-out" style="transform: translateX(0%);">
            ${activeBanners.map((b) => `
              <div class="w-full min-w-full flex-shrink-0 relative overflow-hidden bg-slate-950 text-white p-6 sm:p-9 lg:p-11 min-h-[210px] sm:min-h-[240px] flex flex-col justify-between">
                
                <!-- Background Image (Original Colors, No Green Tint) with Clean Neutral Scrim -->
                ${b.imageUrl ? `
                  <img 
                    src="${b.imageUrl}" 
                    alt="${b.title}" 
                    class="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" 
                  />
                  <!-- Neutral Dark Scrim Gradient for Crisp Text Legibility (No Color Wash) -->
                  <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20 pointer-events-none"></div>
                ` : `
                  <!-- Fallback Deep Slate Gradient if no image -->
                  <div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 pointer-events-none"></div>
                `}

                <!-- Top Left: Clean Frosted Glass Badge (No Green) -->
                <div class="relative z-10 flex items-center mb-2">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-xs">
                    <span class="material-symbols-outlined text-[13px]">local_offer</span>
                    ${b.badgeText || 'PROMO'}
                  </span>
                </div>

                <!-- Middle: Title & Subtitle -->
                <div class="relative z-10 my-1 max-w-2xl">
                  <h2 class="text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight text-white mb-1.5 leading-snug drop-shadow-sm">
                    ${b.title}
                  </h2>
                  <p class="text-xs sm:text-sm text-white/80 font-normal leading-relaxed line-clamp-2 max-w-xl">
                    ${b.subtitle}
                  </p>
                </div>

                <!-- Bottom: Action CTA -->
                <div class="relative z-10 pt-2 flex items-center gap-3">
                  <a 
                    href="${b.targetUrl || '#/search'}" 
                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 font-extrabold text-xs sm:text-sm shadow-md hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>${b.ctaText || 'Lihat Promo'}</span>
                    <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>

        </div>
      </section>

      <!-- WHY KOSTKITA VALUE PROPS -->
      <section class="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <div class="flex items-center justify-center gap-2 text-xs font-bold text-[#004337] uppercase tracking-widest mb-1.5">
            <span class="w-3 h-1 bg-[#004337] rounded-full"></span>
            <span>Keunggulan Platform</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Kenapa Cari Kost di KostKita?</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div class="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-[#004337] flex items-center justify-center mb-4 shadow-sm">
              <span class="material-symbols-outlined text-[26px]">chat</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 mb-2">Langsung ke Pemilik Kost</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Tanya ketersediaan kamar dan negosiasi langsung ke nomor WhatsApp resmi pemilik kost tanpa melalui agen atau calo.
            </p>
          </div>

          <div class="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 shadow-sm">
              <span class="material-symbols-outlined text-[26px]">map</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 mb-2">Peta Interaktif & Akurat</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Lihat lokasi kost secara geografis di peta, cek estimasi jarak ke kampus atau kantor impianmu dengan fitur GPS real-time.
            </p>
          </div>

          <div class="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-[#004337] flex items-center justify-center mb-4 shadow-sm">
              <span class="material-symbols-outlined text-[26px]">verified</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 mb-2">Transparan & Terverifikasi</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Foto kamar asli, rincian fasilitas lengkap, serta harga sewa transparan tanpa ada biaya tersembunyi yang merugikan.
            </p>
          </div>
        </div>
      </section>

      <!-- OWNER CTA BANNER -->
      <section class="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div class="relative bg-gradient-to-r from-[#004337] via-[#005a4a] to-[#004337] rounded-3xl p-8 sm:p-12 text-white overflow-hidden shadow-xl">
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
                class="px-6 py-3 rounded-xl bg-white text-[#004337] font-bold text-sm hover:bg-slate-100 transition-colors shadow-md"
              >
                Mulai Trial Gratis 30 Hari
              </a>
              <a 
                href="${OWNER_ROUTES.login}" 
                class="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-colors"
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
  const form = document.getElementById('heroSearchForm') as HTMLFormElement | null;
  const input = document.getElementById('heroInputSearch') as HTMLInputElement | null;
  const priceSelect = document.getElementById('heroPriceRange') as HTMLSelectElement | null;
  const btnGps = document.getElementById('btnHeroGps') as HTMLButtonElement | null;
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

  // ── Promo Banner Carousel Controller ──
  const track = document.getElementById('promoCarouselTrack') as HTMLElement | null;
  const prevBtn = document.getElementById('carouselPrevBtn') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('carouselNextBtn') as HTMLButtonElement | null;
  const counter = document.getElementById('bannerSlideCounter');
  const container = document.getElementById('promoCarouselContainer') as HTMLElement | null;

  if (track) {
    const totalSlides = track.children.length;
    if (totalSlides > 1) {
      let curSlide = 0;
      let autoTimer: any = null;

      const updateSlide = (idx: number) => {
        curSlide = (idx + totalSlides) % totalSlides;
        track.style.transform = `translateX(-${curSlide * 100}%)`;
        if (counter) {
          counter.textContent = `${curSlide + 1} dari ${totalSlides}`;
        }
      };

      const startAutoPlay = () => {
        stopAutoPlay();
        autoTimer = setInterval(() => {
          updateSlide(curSlide + 1);
        }, 5000);
      };

      const stopAutoPlay = () => {
        if (autoTimer) {
          clearInterval(autoTimer);
          autoTimer = null;
        }
      };

      if (prevBtn) {
        prevBtn.onclick = () => {
          updateSlide(curSlide - 1);
          startAutoPlay();
        };
      }

      if (nextBtn) {
        nextBtn.onclick = () => {
          updateSlide(curSlide + 1);
          startAutoPlay();
        };
      }

      if (container) {
        container.onmouseenter = stopAutoPlay;
        container.onmouseleave = startAutoPlay;

        // Mobile Touch Swipe
        let touchStartX = 0;
        container.ontouchstart = (e) => {
          touchStartX = e.touches[0].clientX;
          stopAutoPlay();
        };
        container.ontouchend = (e) => {
          const touchEndX = e.changedTouches[0].clientX;
          const diff = touchStartX - touchEndX;
          if (Math.abs(diff) > 40) {
            if (diff > 0) updateSlide(curSlide + 1);
            else updateSlide(curSlide - 1);
          }
          startAutoPlay();
        };
      }

      startAutoPlay();
    }
  }
}
