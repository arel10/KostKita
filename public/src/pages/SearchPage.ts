import L from 'leaflet';
import { fetchProperties, formatRupiah } from '../services/api';
import { OWNER_ROUTES } from '../services/config';
import { PropertyListItem, SearchFilterParams } from '../types';

let leafletMap: L.Map | null = null;
let mapMarkers: { [propertyId: string]: L.Marker } = {};
let popupHtmlById: { [propertyId: string]: string } = {};
let baseLayer: L.TileLayer | null = null;
let labelsLayer: L.TileLayer | null = null;

// Page state shared between render + setup (avoids a second fetch)
let lastProperties: PropertyListItem[] = [];
let lastContext = { locationLabel: 'Semua Lokasi', hasGps: false };
let currentOrder: PropertyListItem[] = [];
let selectedId: string | null = null;
let isImmersive = false;
let mapStyle: 'osm' | 'hot' = 'osm';
let globalListenersBound = false;

const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const esc = (s: string | undefined | null) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const toNum = (v: number | string | null | undefined) => (typeof v === 'string' ? parseFloat(v) : Number(v ?? 0));

const primaryPhotoOf = (p: PropertyListItem) =>
  p.photos?.find((ph) => ph.isPrimary)?.url || p.photos?.[0]?.url || FALLBACK_PHOTO;

const cleanCity = (c?: string) => (c || '').replace(/^(Kota|Kabupaten|Kab\.)\s+/i, '').trim();

/** "Rp 1,3 Jt" / "Rp 500rb" — used for map pins */
function pinPrice(amount: number | string): string {
  const n = toNum(amount);
  if (isNaN(n)) return 'Rp 0';
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} Jt`;
  if (n >= 1000) return `Rp ${Math.round(n / 1000)}rb`;
  return `Rp ${n}`;
}

/** "500rb" / "2.5Jt" — used in immersive UI */
function shortPrice(amount: number | string): string {
  const n = toNum(amount);
  if (isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}Jt`;
  if (n >= 1000) return `${Math.round(n / 1000)}rb`;
  return `${n}`;
}

function typeMeta(type: string) {
  if (type === 'putri') return { label: 'Kost Putri', cls: 'bg-rose-100 text-rose-800' };
  if (type === 'putra') return { label: 'Kost Putra', cls: 'bg-sky-100 text-sky-800' };
  return { label: 'Kost Campur', cls: 'bg-[#d9f2e6] text-[#0b4a3e]' };
}

function facilityChip(name: string): { icon: string; label: string } {
  const n = name.toLowerCase();
  if (n.includes('wifi') || n.includes('wi-fi') || n.includes('internet')) return { icon: 'wifi', label: '' };
  if (n.includes('kamar mandi') || n.includes('km dalam')) return { icon: 'shower', label: 'KM Dalam' };
  if (n.includes('24')) return { icon: 'schedule', label: '24' };
  if (n.includes('ac')) return { icon: 'ac_unit', label: 'AC' };
  if (n.includes('parkir')) return { icon: 'local_parking', label: 'Parkir' };
  if (n.includes('water heater') || n.includes('air panas')) return { icon: 'water_drop', label: 'Heater' };
  if (n.includes('kasur') || n.includes('bed')) return { icon: 'bed', label: 'Kasur' };
  if (n.includes('dapur')) return { icon: 'skillet', label: 'Dapur' };
  if (n.includes('laundry')) return { icon: 'local_laundry_service', label: 'Laundry' };
  return { icon: 'check_circle', label: name.length > 10 ? name.slice(0, 9) + '…' : name };
}

function sortList(list: PropertyListItem[], mode: string): PropertyListItem[] {
  const arr = [...list];
  if (mode === 'price_asc') arr.sort((a, b) => toNum(a.priceStart) - toNum(b.priceStart));
  else if (mode === 'price_desc') arr.sort((a, b) => toNum(b.priceStart) - toNum(a.priceStart));
  else if (mode === 'distance') arr.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  return arr;
}

function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem('kk_favorites') || '[]');
  } catch {
    return [];
  }
}


/* -------------------------------------------------------------------------- */
/*                                   Render                                   */
/* -------------------------------------------------------------------------- */

export async function renderSearchPage(queryParams: URLSearchParams): Promise<string> {
  const search = queryParams.get('search') || '';
  const city = queryParams.get('city') || '';
  const type = queryParams.get('type') || '';
  const priceMin = queryParams.get('priceMin') ? parseFloat(queryParams.get('priceMin')!) : undefined;
  const priceMax = queryParams.get('priceMax') ? parseFloat(queryParams.get('priceMax')!) : undefined;
  const lat = queryParams.get('lat') ? parseFloat(queryParams.get('lat')!) : undefined;
  const lng = queryParams.get('lng') ? parseFloat(queryParams.get('lng')!) : undefined;
  const radius = queryParams.get('radius') ? parseFloat(queryParams.get('radius')!) : undefined;
  const facilitiesParam = queryParams.getAll('facilities');

  const filterParams: SearchFilterParams = {
    search: search || city || undefined,
    type: (type as any) || undefined,
    priceMin,
    priceMax,
    lat,
    lng,
    radius,
    facilities: facilitiesParam.length > 0 ? facilitiesParam : undefined,
    perPage: 20,
  };

  let properties: PropertyListItem[] = [];
  let totalCount = 0;
  let errorMsg = '';

  try {
    const res = await fetchProperties(filterParams);
    properties = res.data;
    totalCount = res.meta.total;
  } catch (e: any) {
    console.error('Error fetching search properties:', e);
    errorMsg = e.message || 'Gagal memuat daftar kost.';
  }

  // Location label for immersive header pill
  let locationLabel = cleanCity(search || city);
  if (!locationLabel && properties.length > 0) {
    const counts: Record<string, number> = {};
    properties.forEach((p) => {
      const c = cleanCity(p.city);
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    locationLabel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }
  lastProperties = properties;
  lastContext = { locationLabel: locationLabel || 'Semua Lokasi', hasGps: !!(lat && lng) };

  const prices = properties.map((p) => toNum(p.priceStart)).filter((n) => !isNaN(n) && n > 0);
  const priceRange =
    prices.length > 0
      ? Math.min(...prices) === Math.max(...prices)
        ? `Rp ${shortPrice(Math.min(...prices))}`
        : `Rp ${shortPrice(Math.min(...prices))} - ${shortPrice(Math.max(...prices))}`
      : 'Rp -';

  const chip = (active: boolean) =>
    `shrink-0 h-9 px-4 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
      active
        ? 'bg-primary text-white shadow-[0_6px_16px_-6px_rgba(0,67,55,0.6)]'
        : 'bg-white text-slate-700 shadow-[0_1px_3px_rgba(11,28,48,0.06)] hover:bg-[#f2f8f5] hover:text-primary'
    }`;

  const favorites = getFavorites();
  const hasFilters = !!(type || search || city || facilitiesParam.length > 0 || lat);

  return `
    <div class="w-full bg-[#fbfcfb] min-h-[calc(100vh-80px)]">
      <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10">

        <!-- ============ FILTER PANEL ============ -->
        <section class="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#eef5f1] via-[#f1f7f3] to-[#e9f3ed] border border-[#e3eee8] px-4 sm:px-5 py-4 space-y-3.5">
          <!-- decorative houses -->
          <svg class="pointer-events-none absolute right-0 bottom-0 h-[92px] w-[260px] text-primary opacity-[0.07]" viewBox="0 0 260 92" fill="currentColor" aria-hidden="true">
            <path d="M20 92V58l26-20 26 20v34H20z"/>
            <path d="M80 92V44l46-34 46 34v48H80zm34-30h24v30h-24z" fill-rule="evenodd"/>
            <path d="M180 92V62l22-16 22 16v30h-44z"/>
            <circle cx="236" cy="70" r="14"/><rect x="234" y="76" width="4" height="16"/>
            <circle cx="10" cy="74" r="9"/><rect x="8.5" y="78" width="3" height="14"/>
          </svg>

          <div class="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="relative flex-1 md:max-w-[560px] h-12 bg-white rounded-full shadow-[0_2px_10px_-4px_rgba(11,28,48,0.12)] flex items-center pl-4 pr-1.5">
              <span class="material-symbols-outlined text-slate-500 text-[20px]">location_on</span>
              <input
                type="text"
                id="searchInputBar"
                value="${esc(search || city)}"
                placeholder="Cari lokasi, nama jalan, atau kampus..."
                class="flex-1 h-full bg-transparent px-3 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none font-sans"
              />
              <button id="btnApplySearch" type="button" class="h-9 px-5 rounded-full bg-primary hover:bg-primary-container text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px]">search</span>
                <span>Cari</span>
              </button>
            </div>

            <div class="flex items-center gap-3 justify-between md:justify-end">
              <span class="text-xs text-slate-600 font-medium">Urutkan:</span>
              <div class="relative">
                <select id="sortSelect" class="appearance-none h-10 w-[160px] pl-4 pr-9 rounded-full bg-white text-xs font-semibold text-slate-800 shadow-[0_2px_10px_-4px_rgba(11,28,48,0.12)] border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="relevance">Rekomendasi</option>
                  <option value="price_asc">Harga Terendah</option>
                  <option value="price_desc">Harga Tertinggi</option>
                  ${lat && lng ? '<option value="distance">Jarak Terdekat</option>' : ''}
                </select>
                <span class="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">expand_more</span>
              </div>
              <button id="toggleMobileMapBtn" type="button" class="lg:hidden h-10 px-4 rounded-full bg-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <span class="material-symbols-outlined text-[16px]">map</span>
                <span>Peta</span>
              </button>
            </div>
          </div>

          <div class="relative flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button class="filter-type-btn ${chip(type === '')}" data-type="">
              <span class="material-symbols-outlined text-[16px]">grid_view</span><span>Semua Tipe</span>
            </button>
            <button class="filter-type-btn ${chip(type === 'putra')}" data-type="putra">
              <span class="material-symbols-outlined text-[16px]">man</span><span>Putra</span>
            </button>
            <button class="filter-type-btn ${chip(type === 'putri')}" data-type="putri">
              <span class="material-symbols-outlined text-[16px]">woman</span><span>Putri</span>
            </button>
            <button class="filter-type-btn ${chip(type === 'campur')}" data-type="campur">
              <span class="material-symbols-outlined text-[16px]">group</span><span>Campur</span>
            </button>

            <span class="w-2 shrink-0"></span>

            <button class="filter-facility-btn ${chip(facilitiesParam.includes('AC'))}" data-facility="AC">
              <span class="material-symbols-outlined text-[16px]">ac_unit</span><span>AC</span>
            </button>
            <button class="filter-facility-btn ${chip(facilitiesParam.includes('WiFi'))}" data-facility="WiFi">
              <span class="material-symbols-outlined text-[16px]">wifi</span><span>WiFi</span>
            </button>
            <button class="filter-facility-btn ${chip(facilitiesParam.includes('Kamar Mandi Dalam'))}" data-facility="Kamar Mandi Dalam">
              <span class="material-symbols-outlined text-[16px]">bathtub</span><span>KM Dalam</span>
            </button>
            <button class="filter-facility-btn ${chip(facilitiesParam.includes('Water Heater'))}" data-facility="Water Heater">
              <span class="material-symbols-outlined text-[16px]">water_drop</span><span>Water Heater</span>
            </button>

            ${
              hasFilters
                ? `<a href="#/search" class="shrink-0 h-9 px-4 rounded-full bg-white/70 hover:bg-white text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors">
                    <span class="material-symbols-outlined text-[16px]">close</span><span>Reset</span>
                  </a>`
                : ''
            }
          </div>
        </section>

        <!-- ============ SPLIT VIEW ============ -->
        <div class="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.68fr)] gap-4 items-start">

          <!-- LIST -->
          <div id="listingContainer" class="flex flex-col gap-4 min-w-0">
            <h1 class="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900">
              <span class="material-symbols-outlined text-primary text-[22px]" style="font-variation-settings:'FILL' 1">eco</span>
              <span>Menampilkan <span class="text-primary">${totalCount} Kost</span></span>
              ${search || city ? `<span class="font-normal text-slate-500 text-sm truncate">di "${esc(search || city)}"</span>` : ''}
              ${lat && lng ? `<span class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">📍 Sekitar GPS</span>` : ''}
            </h1>

            ${errorMsg ? `<div class="p-4 rounded-2xl bg-error-container text-error text-sm">${esc(errorMsg)}</div>` : ''}

            ${
              properties.length === 0 && !errorMsg
                ? `
                <div class="bg-white rounded-[22px] p-12 text-center border border-slate-100 shadow-card">
                  <div class="w-16 h-16 rounded-full bg-[#eef5f1] flex items-center justify-center text-primary mx-auto mb-4">
                    <span class="material-symbols-outlined text-[32px]">apartment</span>
                  </div>
                  <h3 class="text-lg font-bold text-slate-900 mb-1">Tidak ada kost yang cocok</h3>
                  <p class="text-sm text-slate-500 max-w-sm mx-auto mb-6">Coba sesuaikan kata kunci, kurangi filter fasilitas, atau gunakan lokasi GPS.</p>
                  <a href="#/search" class="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-semibold inline-block">Lihat Semua Kost</a>
                </div>`
                : ''
            }

            <div id="propertyGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              ${properties
                .map((item) => {
                  const tm = typeMeta(item.type);
                  const fav = favorites.includes(item.id);
                  return `
                  <article
                    class="property-card group bg-white rounded-[18px] overflow-hidden border border-slate-100 shadow-[0_4px_18px_-8px_rgba(11,28,48,0.12)] hover:shadow-[0_18px_36px_-14px_rgba(0,67,55,0.28)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer"
                    data-id="${item.id}"
                    data-slug="${item.slug}"
                  >
                    <div class="relative h-[150px] overflow-hidden bg-slate-100">
                      <img src="${primaryPhotoOf(item)}" alt="${esc(item.name)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                      <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span class="px-2.5 py-[3px] rounded-md text-[10px] font-semibold ${tm.cls}">${tm.label}</span>
                        <span class="px-2 py-[3px] rounded-md text-[10px] font-semibold bg-primary text-white flex items-center gap-1">
                          <span class="material-symbols-outlined text-[12px]" style="font-variation-settings:'FILL' 1">verified</span>Verifikasi
                        </span>
                      </div>
                      <button type="button" class="fav-btn absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/95 shadow flex items-center justify-center hover:scale-110 transition-transform ${fav ? 'text-rose-500' : 'text-slate-600'}" data-id="${item.id}" aria-label="Simpan">
                        <span class="material-symbols-outlined text-[16px]" style="font-variation-settings:'FILL' ${fav ? 1 : 0}">favorite</span>
                      </button>
                      ${
                        item.distanceKm !== undefined && item.distanceKm !== null
                          ? `<span class="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-white text-[10px] font-medium flex items-center gap-1">
                              <span class="material-symbols-outlined text-[12px] text-emerald-300">near_me</span>${item.distanceKm} km</span>`
                          : ''
                      }
                    </div>

                    <div class="p-3.5 flex-1 flex flex-col">
                      <div class="flex items-center gap-1 text-[11px] text-slate-500">
                        <span class="material-symbols-outlined text-[14px] text-slate-500" style="font-variation-settings:'FILL' 1">location_on</span>
                        <span class="truncate">${esc(item.district ? `${item.district}, ` : '')}${esc(item.city || 'Indonesia')}</span>
                      </div>
                      <h3 class="mt-0.5 font-bold text-[15px] text-slate-900 group-hover:text-primary transition-colors line-clamp-1">${esc(item.name)}</h3>

                      <div class="flex flex-wrap gap-1.5 mt-2">
                        ${item.facilities
                          .slice(0, 3)
                          .map((f) => `<span class="px-2.5 py-[3px] rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium">${esc(f.facilityName)}</span>`)
                          .join('')}
                        ${item.facilities.length > 3 ? `<span class="px-2 py-[3px] rounded-md bg-slate-100 text-[10px] text-slate-500 font-medium">+${item.facilities.length - 3}</span>` : ''}
                      </div>

                      <div class="mt-auto pt-3 flex items-end justify-between gap-2">
                        <div>
                          <span class="text-[10px] text-slate-500 block leading-tight">Mulai dari</span>
                          <span class="text-[17px] font-bold text-primary leading-tight">${formatRupiah(item.priceStart)}</span>
                          <span class="text-[10px] text-slate-500">/bln</span>
                        </div>
                        <span class="shrink-0 h-8 px-3.5 rounded-full border border-primary/25 text-primary text-[11px] font-semibold flex items-center gap-1 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                          Lihat Detail <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </article>`;
                })
                .join('')}
            </div>
          </div>

          <!-- MAP -->
          <div
            id="mapContainerWrapper"
            class="kk-map-wrap hidden lg:block sticky top-24 h-[calc(100vh-120px)] min-h-[440px] rounded-[22px] overflow-hidden border border-slate-100 shadow-card bg-[#e8efe9] z-20"
          >
            <div id="leafletMapContainer" class="absolute inset-0"></div>

            <!-- Split-view toolbar -->
            <div class="split-only absolute top-3 right-3 z-[1000] flex items-center gap-1 bg-white rounded-full pl-3 pr-1 py-1 shadow-[0_6px_18px_-6px_rgba(11,28,48,0.25)]">
              <button id="btnExpandMap" type="button" class="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-primary pr-2 py-1 cursor-pointer">
                <span class="material-symbols-outlined text-[17px]">open_in_full</span>
                <span>Perbesar Peta</span>
              </button>
              <button id="btnResetMapZoom" type="button" title="Pusatkan Peta" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-[#eef5f1] hover:text-primary cursor-pointer">
                <span class="material-symbols-outlined text-[18px]">my_location</span>
              </button>
            </div>

            <!-- ============ IMMERSIVE CHROME ============ -->
            <div class="imm-only imm-fade"></div>

            <!-- top-left brand + nav rail -->
            <div class="imm-only absolute top-6 left-6 sm:top-16 sm:left-12 z-[1100] flex flex-col gap-2.5">
              <a href="#/" class="kk-glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
                <img src="/logo.png" alt="KostKita" class="h-8 w-auto object-contain" />
                <span class="flex flex-col leading-tight">
                  <span class="text-[15px] font-extrabold text-slate-900">Kost<span class="text-emerald-600">Kita</span></span>
                  <span class="text-[9px] text-slate-600">Cari Kost, Temukan Cerita</span>
                </span>
              </a>
              <div class="kk-glass rounded-2xl p-1.5 flex flex-col gap-1 w-fit">
                <button id="immBtnCenter" type="button" title="Pusatkan peta" class="imm-icon-btn"><span class="material-symbols-outlined">explore</span></button>
                <button id="immBtnList" type="button" title="Tampilkan daftar" class="imm-icon-btn"><span class="material-symbols-outlined">view_list</span></button>
                <button id="immBtnStyle" type="button" title="Ganti gaya peta" class="imm-icon-btn"><span class="material-symbols-outlined">map</span></button>
              </div>
            </div>

            <!-- top-center location + price pill -->
            <div class="imm-only absolute top-16 left-1/2 -translate-x-1/2 z-[1100] hidden md:flex kk-glass rounded-full p-1 items-center gap-1 ring-1 ring-white/70">
              <span class="px-4 py-1.5 rounded-full bg-[#0f4c45] text-white text-[13px] font-medium">${esc(lastContext.locationLabel)}</span>
              <span class="px-3 py-1.5 rounded-full bg-white/60 text-slate-800 text-[13px] font-medium">${priceRange}</span>
            </div>

            <!-- top-right actions -->
            <div class="imm-only absolute top-6 right-6 sm:top-3 sm:right-10 z-[1100] flex flex-col items-end gap-4">
              <div class="flex items-center gap-2">
                <a href="${OWNER_ROUTES.login}" class="hidden sm:flex items-center gap-1.5 px-3 py-2 text-[13px] text-slate-800 hover:text-primary">
                  <span class="material-symbols-outlined text-[19px]">person</span>Pemilik
                </a>
                <a href="${OWNER_ROUTES.register}" class="kk-glass rounded-full px-3.5 py-2 flex items-center gap-1.5 text-[13px] text-slate-800 hover:text-primary">
                  <span class="material-symbols-outlined text-[19px]">home</span>Daftarkan
                </a>
              </div>
              <div class="relative">
                <div class="kk-glass rounded-2xl px-2 py-1.5 flex items-center gap-1">
                  <button id="immBtnSearch" type="button" title="Cari" class="imm-icon-btn"><span class="material-symbols-outlined">search</span></button>
                  <button id="immBtnFilter" type="button" title="Filter" class="imm-icon-btn"><span class="material-symbols-outlined">filter_alt</span></button>
                  <button id="immBtnSort" type="button" title="Urutkan" class="imm-icon-btn !w-auto px-1.5 gap-0.5"><span class="material-symbols-outlined">swap_vert</span><span class="material-symbols-outlined !text-[18px]">expand_more</span></button>
                </div>

                <!-- popovers -->
                <div id="immPopSearch" class="imm-pop hidden">
                  <div class="flex items-center gap-2 bg-white rounded-full pl-3 pr-1 h-10 shadow-inner">
                    <span class="material-symbols-outlined text-slate-400 text-[18px]">location_on</span>
                    <input id="immSearchInput" type="text" value="${esc(search || city)}" placeholder="Cari lokasi atau kampus..." class="flex-1 bg-transparent text-xs focus:outline-none font-sans" />
                    <button id="immSearchGo" type="button" class="h-8 px-3 rounded-full bg-primary text-white text-[11px] font-semibold">Cari</button>
                  </div>
                </div>
                <div id="immPopFilter" class="imm-pop hidden">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Tipe Kost</p>
                  <div class="flex flex-wrap gap-1.5 mb-3">
                    ${[['', 'Semua'], ['putra', 'Putra'], ['putri', 'Putri'], ['campur', 'Campur']]
                      .map(([v, l]) => `<button class="filter-type-btn imm-chip ${type === v ? 'is-active' : ''}" data-type="${v}">${l}</button>`)
                      .join('')}
                  </div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Fasilitas</p>
                  <div class="flex flex-wrap gap-1.5">
                    ${[['AC', 'AC'], ['WiFi', 'WiFi'], ['Kamar Mandi Dalam', 'KM Dalam'], ['Water Heater', 'Water Heater']]
                      .map(([v, l]) => `<button class="filter-facility-btn imm-chip ${facilitiesParam.includes(v) ? 'is-active' : ''}" data-facility="${v}">${l}</button>`)
                      .join('')}
                  </div>
                </div>
                <div id="immPopSort" class="imm-pop hidden !w-48 !p-1.5">
                  ${[['relevance', 'Rekomendasi'], ['price_asc', 'Harga Terendah'], ['price_desc', 'Harga Tertinggi'], ...(lat && lng ? [['distance', 'Jarak Terdekat']] : [])]
                    .map(([v, l]) => `<button class="imm-sort-opt w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-[#eef5f1]" data-sort="${v}">${l}</button>`)
                    .join('')}
                </div>
              </div>
            </div>

            <!-- featured card (hidden by default until a kost pin is clicked) -->
            <div id="immFeatured" class="imm-only hidden absolute z-[1100] left-4 right-4 bottom-24 sm:right-auto sm:bottom-auto sm:left-[23.5%] sm:top-1/2 sm:-translate-y-1/2 sm:w-[340px] h-[300px] sm:h-[350px]"></div>

            <!-- bottom-left exit -->
            <button id="immBtnExit" type="button" title="Kecilkan peta (Esc)" class="imm-only absolute bottom-6 left-6 sm:bottom-8 sm:left-12 z-[1100] kk-glass rounded-2xl w-12 h-12 flex items-center justify-center text-slate-800 hover:text-primary">
              <span class="material-symbols-outlined">map</span>
            </button>

            <!-- bottom-center ticker -->
            <div id="immTicker" class="imm-only absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[1100] hidden md:flex kk-glass rounded-xl px-4 py-2.5 items-center gap-1.5 text-[13px] text-slate-700 max-w-[60vw] whitespace-nowrap"></div>

            <!-- bottom-right tools -->
            <div class="imm-only absolute bottom-6 right-6 sm:bottom-8 sm:right-10 z-[1100] kk-glass rounded-2xl p-1.5 flex flex-col gap-1">
              <a href="${OWNER_ROUTES.login}" title="Akun pemilik" class="imm-icon-btn"><span class="material-symbols-outlined">account_circle</span></a>
              <button id="immBtnSettings" type="button" title="Ganti gaya peta" class="imm-icon-btn"><span class="material-symbols-outlined">settings</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/*                                   Events                                   */
/* -------------------------------------------------------------------------- */

function readHashParams() {
  const parts = window.location.hash.split('?');
  return new URLSearchParams(parts[1] || '');
}

function writeHashParams(params: URLSearchParams, replace = false) {
  const qs = params.toString();
  const hash = `#/search${qs ? `?${qs}` : ''}`;
  if (replace) history.replaceState(null, '', hash);
  else window.location.hash = hash;
}

export function setupSearchPageEvents(propertiesData: PropertyListItem[] = lastProperties) {
  isImmersive = false;
  selectedId = null;
  currentOrder = [...propertiesData];
  document.body.classList.remove('kk-no-scroll');

  if (!globalListenersBound) {
    globalListenersBound = true;
    window.addEventListener('hashchange', () => {
      if (!window.location.hash.startsWith('#/search')) document.body.classList.remove('kk-no-scroll');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isImmersive) exitImmersive();
    });
  }

  const mapWrapper = document.getElementById('mapContainerWrapper');
  const listContainer = document.getElementById('listingContainer');

  const updateQueryParams = (newParams: { [key: string]: string | null }) => {
    const params = readHashParams();
    for (const [key, val] of Object.entries(newParams)) {
      if (val === null || val === '') params.delete(key);
      else params.set(key, val);
    }
    writeHashParams(params);
  };

  // 1. Mobile map toggle → opens immersive map
  document.getElementById('toggleMobileMapBtn')?.addEventListener('click', () => enterImmersive());

  // 2. Search
  const searchInput = document.getElementById('searchInputBar') as HTMLInputElement | null;
  const executeSearch = (val: string) => updateQueryParams({ search: val.trim(), city: null });
  document.getElementById('btnApplySearch')?.addEventListener('click', () => executeSearch(searchInput?.value || ''));
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeSearch(searchInput.value);
  });

  // Type filters (both split + immersive)
  document.querySelectorAll<HTMLElement>('.filter-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => updateQueryParams({ type: btn.dataset.type || '' }));
  });

  // Facility filters
  document.querySelectorAll<HTMLElement>('.filter-facility-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const facility = btn.dataset.facility;
      if (!facility) return;
      const params = readHashParams();
      const existing = params.getAll('facilities');
      params.delete('facilities');
      const next = existing.includes(facility) ? existing.filter((f) => f !== facility) : [...existing, facility];
      next.forEach((f) => params.append('facilities', f));
      writeHashParams(params);
    });
  });

  // Sorting
  const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement | null;
  const applySort = (mode: string) => {
    currentOrder = sortList(propertiesData, mode);
    const grid = document.getElementById('propertyGrid');
    if (grid) {
      currentOrder.forEach((p) => {
        const card = grid.querySelector(`.property-card[data-id="${p.id}"]`);
        if (card) grid.appendChild(card);
      });
    }
    if (sortSelect) sortSelect.value = mode;
    document.querySelectorAll<HTMLElement>('.imm-sort-opt').forEach((o) => o.classList.toggle('is-active', o.dataset.sort === mode));
    renderTicker();
  };
  sortSelect?.addEventListener('change', () => applySort(sortSelect.value));

  // Favorites
  document.querySelectorAll<HTMLElement>('.fav-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id!;
      const favs = getFavorites();
      const isFav = favs.includes(id);
      const next = isFav ? favs.filter((f) => f !== id) : [...favs, id];
      localStorage.setItem('kk_favorites', JSON.stringify(next));
      btn.classList.toggle('text-rose-500', !isFav);
      btn.classList.toggle('text-slate-600', isFav);
      const icon = btn.querySelector('span');
      if (icon) (icon as HTMLElement).style.fontVariationSettings = `'FILL' ${isFav ? 0 : 1}`;
    });
  });

  // 3. Map
  initLeafletMap(propertiesData);

  document.getElementById('btnExpandMap')?.addEventListener('click', () => enterImmersive());
  document.getElementById('btnResetMapZoom')?.addEventListener('click', () => fitAll());
  document.getElementById('immBtnExit')?.addEventListener('click', () => exitImmersive());
  document.getElementById('immBtnList')?.addEventListener('click', () => exitImmersive());
  document.getElementById('immBtnCenter')?.addEventListener('click', () => fitAll());
  const toggleStyle = () => {
    mapStyle = mapStyle === 'osm' ? 'hot' : 'osm';
    applyTileStyle();
  };
  document.getElementById('immBtnStyle')?.addEventListener('click', toggleStyle);
  document.getElementById('immBtnSettings')?.addEventListener('click', toggleStyle);

  // Immersive popovers
  const pops = ['immPopSearch', 'immPopFilter', 'immPopSort'];
  const togglePop = (id: string) => {
    pops.forEach((p) => {
      const el = document.getElementById(p);
      if (!el) return;
      if (p === id) el.classList.toggle('hidden');
      else el.classList.add('hidden');
    });
    if (id === 'immPopSearch') setTimeout(() => (document.getElementById('immSearchInput') as HTMLInputElement)?.focus(), 30);
  };
  document.getElementById('immBtnSearch')?.addEventListener('click', () => togglePop('immPopSearch'));
  document.getElementById('immBtnFilter')?.addEventListener('click', () => togglePop('immPopFilter'));
  document.getElementById('immBtnSort')?.addEventListener('click', () => togglePop('immPopSort'));
  const immInput = document.getElementById('immSearchInput') as HTMLInputElement | null;
  document.getElementById('immSearchGo')?.addEventListener('click', () => executeSearch(immInput?.value || ''));
  immInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeSearch(immInput.value);
  });
  document.querySelectorAll<HTMLElement>('.imm-sort-opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      applySort(opt.dataset.sort || 'relevance');
      togglePop('');
    });
  });
  leafletMap?.on('click', () => togglePop(''));

  // 4. Card ↔ map sync
  document.querySelectorAll<HTMLElement>('.property-card').forEach((card) => {
    const id = card.dataset.id!;
    card.addEventListener('click', () => (window.location.hash = `#/kost/${card.dataset.slug}`));
    card.addEventListener('mouseenter', () => pinEl(id)?.classList.add('active'));
    card.addEventListener('mouseleave', () => pinEl(id)?.classList.remove('active'));
  });

  applySort(sortSelect?.value || 'relevance');

  // Restore immersive mode (e.g. after filtering inside the fullscreen map)
  if (readHashParams().get('view') === 'map' && mapWrapper && listContainer) {
    enterImmersive(true);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Immersive mode                               */
/* -------------------------------------------------------------------------- */

function pinEl(id: string): HTMLElement | null {
  return (mapMarkers[id]?.getElement()?.querySelector('.custom-price-pin') as HTMLElement) || null;
}

function enterImmersive(instant = false) {
  const wrap = document.getElementById('mapContainerWrapper');
  if (!wrap || !leafletMap) return;
  isImmersive = true;
  wrap.classList.add('is-immersive');
  if (!instant) wrap.classList.add('imm-enter');
  setTimeout(() => wrap.classList.remove('imm-enter'), 500);
  document.body.classList.add('kk-no-scroll');

  const params = readHashParams();
  if (params.get('view') !== 'map') {
    params.set('view', 'map');
    writeHashParams(params, true);
  }

  // markers act as selectors instead of popups
  Object.values(mapMarkers).forEach((m) => m.unbindPopup());
  applyTileStyle();

  // Hide featured card initially upon entering fullscreen
  closeFeatureCard();

  setTimeout(() => {
    leafletMap?.invalidateSize();
    fitAll();
  }, 60);
}

function closeFeatureCard() {
  selectedId = null;
  Object.entries(mapMarkers).forEach(([mid, m]) => {
    pinEl(mid)?.classList.remove('selected');
    m.setZIndexOffset(0);
  });
  const host = document.getElementById('immFeatured');
  if (host) {
    host.innerHTML = '';
    host.classList.add('hidden');
  }
  renderTicker();
}

function exitImmersive() {
  const wrap = document.getElementById('mapContainerWrapper');
  if (!wrap) return;
  isImmersive = false;
  wrap.classList.remove('is-immersive');
  document.body.classList.remove('kk-no-scroll');
  ['immPopSearch', 'immPopFilter', 'immPopSort'].forEach((p) => document.getElementById(p)?.classList.add('hidden'));
  closeFeatureCard();

  const params = readHashParams();
  if (params.has('view')) {
    params.delete('view');
    writeHashParams(params, true);
  }

  Object.entries(mapMarkers).forEach(([id, m]) => {
    if (popupHtmlById[id]) m.bindPopup(popupHtmlById[id], { maxWidth: 280 });
  });
  applyTileStyle();
  setTimeout(() => {
    leafletMap?.invalidateSize();
    fitAll();
  }, 60);
}

function selectProperty(id: string, pan = true) {
  const prop = currentOrder.find((p) => p.id === id);
  if (!prop) return;
  selectedId = id;

  Object.entries(mapMarkers).forEach(([mid, m]) => {
    pinEl(mid)?.classList.toggle('selected', mid === id);
    m.setZIndexOffset(mid === id ? 1000 : 0);
  });

  const host = document.getElementById('immFeatured');
  if (host) {
    host.classList.remove('hidden');
    const chips = prop.facilities
      .slice(0, 3)
      .map((f) => {
        const c = facilityChip(f.facilityName);
        return `<span class="imm-fchip"><span class="material-symbols-outlined">${c.icon}</span>${c.label ? `<span>${esc(c.label)}</span>` : prop.facilities.length > 3 ? '<span>+</span>' : ''}</span>`;
      })
      .join('');
    host.innerHTML = `
      <div class="relative w-full h-full">
        <!-- Close button to dismiss info card -->
        <button
          id="immCloseFeatureCard"
          type="button"
          title="Tutup Info Kost"
          aria-label="Tutup"
          class="absolute -top-3 -right-3 z-30 w-8 h-8 rounded-full bg-white/95 text-slate-700 hover:text-rose-600 hover:bg-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>

        <a href="#/kost/${prop.slug}" class="kk-feature-card block w-full h-full rounded-[22px] overflow-hidden relative group">
          <img src="${primaryPhotoOf(prop)}" alt="${esc(prop.name)}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
          <div class="absolute inset-0 bg-gradient-to-b from-black/25 via-[#0f4c45]/30 to-[#0d4640]/95"></div>
          <div class="absolute left-0 right-0 bottom-0 p-4 text-white">
            <div class="flex items-center gap-1 text-[12px] text-white/90">
              <span class="material-symbols-outlined text-[15px]" style="font-variation-settings:'FILL' 1">location_on</span>
              <span class="truncate">${esc(prop.district ? `${prop.district}, ` : '')}${esc(cleanCity(prop.city) || 'Indonesia')}</span>
            </div>
            <div class="flex items-center justify-between gap-2 mt-0.5">
              <h3 class="text-[17px] font-bold leading-snug line-clamp-1">${esc(prop.name)}</h3>
              <span class="shrink-0 w-5 h-5 rounded-full bg-white/90 text-[#0f4c45] flex items-center justify-center">
                <span class="material-symbols-outlined text-[14px] font-bold">check</span>
              </span>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-2.5">${chips}</div>
            <p class="mt-4 text-[17px] font-bold">Rp ${shortPrice(prop.priceStart)} <span class="text-[12px] font-normal text-white/80">/ bln</span></p>
          </div>
        </a>
      </div>`;

    document.getElementById('immCloseFeatureCard')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeFeatureCard();
    });

    host.classList.remove('imm-card-swap');
    void host.offsetWidth;
    host.classList.add('imm-card-swap');
  }

  renderTicker();

  if (pan && leafletMap && prop.latitude && prop.longitude) {
    const w = leafletMap.getSize().x;
    leafletMap.panInside([toNum(prop.latitude), toNum(prop.longitude)], {
      paddingTopLeft: [w < 640 ? 60 : Math.round(w * 0.5), 140],
      paddingBottomRight: [120, 140],
    });
  }
}

function renderTicker() {
  const el = document.getElementById('immTicker');
  if (!el) return;
  if (!selectedId) {
    el.innerHTML = `<span>Menampilkan ${currentOrder.length} Kost di ${esc(lastContext.locationLabel)}. Klik pin peta untuk melihat info kost.</span>`;
    return;
  }
  const idx = Math.max(0, currentOrder.findIndex((p) => p.id === selectedId));
  const next = [1, 2].map((k) => currentOrder[(idx + k) % currentOrder.length]).filter((p) => p && p.id !== selectedId);
  const uniqueNext = next.filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
  el.innerHTML = `
    <span>Menampilkan ${currentOrder.length} Kost di ${esc(lastContext.locationLabel)}.${uniqueNext.length ? ' Berikutnya:' : ''}</span>
    ${uniqueNext
      .map((p) => `<button type="button" class="imm-next font-semibold text-slate-900 hover:text-primary max-w-[110px] truncate ml-2" data-id="${p.id}">${esc(p.name)}</button>`)
      .join('')}
  `;
  el.querySelectorAll<HTMLElement>('.imm-next').forEach((b) => b.addEventListener('click', () => selectProperty(b.dataset.id!)));
}

/* -------------------------------------------------------------------------- */
/*                                    Map                                     */
/* -------------------------------------------------------------------------- */

function applyTileStyle() {
  if (!leafletMap) return;
  const wrap = document.getElementById('mapContainerWrapper');
  wrap?.classList.remove('style-duo');

  // Completely free open tile providers (no API key required)
  const isHot = mapStyle === 'hot';
  const url = isHot
    ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = isHot
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  if (!baseLayer) {
    baseLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      className: 'kk-base-tiles',
    }).addTo(leafletMap);
  } else {
    baseLayer.setUrl(url);
  }

  if (labelsLayer) {
    labelsLayer.remove();
    labelsLayer = null;
  }
}

function fitAll() {
  if (!leafletMap) return;
  const valid = currentOrder.filter((p) => p.latitude && p.longitude);
  if (valid.length === 0) return;
  const size = leafletMap.getSize();
  if (valid.length === 1) {
    leafletMap.setView([toNum(valid[0].latitude), toNum(valid[0].longitude)], 14);
    return;
  }
  const bounds = L.latLngBounds(valid.map((p) => [toNum(p.latitude), toNum(p.longitude)] as [number, number]));
  if (isImmersive && size.x >= 768) {
    leafletMap.fitBounds(bounds, { paddingTopLeft: [Math.round(size.x * 0.58), 140], paddingBottomRight: [140, 120], maxZoom: 14 });
  } else {
    leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }
}

function initLeafletMap(properties: PropertyListItem[]) {
  const container = document.getElementById('leafletMapContainer');
  if (!container) return;

  if (leafletMap) {
    leafletMap.remove();
  }
  leafletMap = null;
  baseLayer = null;
  labelsLayer = null;
  mapMarkers = {};
  popupHtmlById = {};

  const valid = properties.filter((p) => p.latitude && p.longitude);
  const center: [number, number] = valid.length > 0 ? [toNum(valid[0].latitude), toNum(valid[0].longitude)] : [-0.9242, 100.3831];

  leafletMap = L.map('leafletMapContainer', { zoomControl: true, scrollWheelZoom: true, attributionControl: true }).setView(center, 12);
  leafletMap.createPane('kkLabels');
  const labelsPane = leafletMap.getPane('kkLabels');
  if (labelsPane) {
    labelsPane.style.zIndex = '450';
    labelsPane.style.pointerEvents = 'none';
  }

  applyTileStyle();

  valid.forEach((prop) => {
    const icon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="custom-price-pin"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">home</span><span>${pinPrice(prop.priceStart)}</span></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const marker = L.marker([toNum(prop.latitude), toNum(prop.longitude)], { icon }).addTo(leafletMap!);
    mapMarkers[prop.id] = marker;

    const tm = typeMeta(prop.type);
    popupHtmlById[prop.id] = `
      <div class="w-64 font-sans text-slate-900">
        <div class="h-32 w-full overflow-hidden bg-slate-100">
          <img src="${primaryPhotoOf(prop)}" alt="${esc(prop.name)}" class="w-full h-full object-cover" />
        </div>
        <div class="p-3.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-primary">${tm.label} • ${esc(cleanCity(prop.city))}</span>
          <h4 class="font-bold text-sm line-clamp-1 mt-0.5">${esc(prop.name)}</h4>
          <p class="text-xs text-primary font-bold mt-1">${formatRupiah(prop.priceStart)} <span class="text-[10px] font-normal text-slate-500">/bln</span></p>
          <a href="#/kost/${prop.slug}" class="mt-3 block text-center w-full py-2 rounded-full bg-primary hover:bg-primary-container !text-white text-xs font-semibold transition-colors">Lihat Detail Kost</a>
        </div>
      </div>`;
    marker.bindPopup(popupHtmlById[prop.id], { maxWidth: 280 });

    marker.on('click', () => {
      if (isImmersive) selectProperty(prop.id);
    });
    marker.on('mouseover', () => {
      document.querySelector(`.property-card[data-id="${prop.id}"]`)?.classList.add('ring-2', 'ring-primary/40');
    });
    marker.on('mouseout', () => {
      document.querySelector(`.property-card[data-id="${prop.id}"]`)?.classList.remove('ring-2', 'ring-primary/40');
    });
  });

  setTimeout(() => {
    leafletMap?.invalidateSize();
    fitAll();
  }, 50);
}
