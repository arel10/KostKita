import L from 'leaflet';
import { fetchProperties, formatRupiah, formatCompactPrice } from '../services/api';
import { PropertyListItem, SearchFilterParams } from '../types';

let leafletMap: L.Map | null = null;
let mapMarkers: { [propertyId: string]: L.Marker } = {};

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

  // Active filter chip helpers
  const isTypeActive = (t: string) => (type === t ? 'bg-primary text-white font-bold' : 'bg-white text-on-surface hover:bg-surface-container');
  const isFacilityActive = (f: string) => (facilitiesParam.includes(f) ? 'bg-primary text-white font-bold' : 'bg-white text-on-surface hover:bg-surface-container');

  return `
    <div class="flex flex-col w-full min-h-[calc(100vh-80px)] bg-surface">
      <!-- SUB-HEADER SEARCH & FILTER BAR -->
      <div class="sticky top-20 z-40 bg-white border-b border-surface-container-high/60 shadow-sm">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
          <div class="flex flex-col md:flex-row items-center justify-between gap-3">
            <!-- Search Input Box -->
            <div class="relative w-full md:max-w-md">
              <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-[20px]">search</span>
              <input 
                type="text" 
                id="searchInputBar"
                value="${search || city}"
                placeholder="Cari lokasi, nama jalan, atau kampus..."
                class="w-full h-10 pl-10 pr-20 rounded-xl bg-surface-container-low text-on-surface text-sm border border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition-all font-sans"
              />
              <button 
                id="btnApplySearch"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors"
              >
                Cari
              </button>
            </div>

            <!-- Sorting & Mobile Map Toggle -->
            <div class="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                <span>Urutkan:</span>
                <select id="sortSelect" class="h-9 px-2.5 rounded-lg bg-surface-container-low border-none text-xs font-semibold text-on-surface cursor-pointer focus:ring-1 focus:ring-primary">
                  <option value="relevance">Rekomendasi</option>
                  <option value="price_asc">Harga Terendah</option>
                  <option value="price_desc">Harga Tertinggi</option>
                  ${lat && lng ? '<option value="distance">Jarak Terdekat (GPS)</option>' : ''}
                </select>
              </div>

              <!-- Mobile Toggle Button (List vs Map) -->
              <button 
                id="toggleMobileMapBtn" 
                class="lg:hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold shadow-sm"
              >
                <span class="material-symbols-outlined text-[16px]">map</span>
                <span id="mobileMapBtnText">Lihat Peta</span>
              </button>
            </div>
          </div>

          <!-- Quick Filters Chips Bar -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
            <button class="filter-type-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors ${type === '' ? 'bg-primary text-white font-bold' : 'bg-white text-on-surface hover:bg-surface-container'}" data-type="">
              Semua Tipe
            </button>
            <button class="filter-type-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors flex items-center gap-1 ${isTypeActive('putra')}" data-type="putra">
              <span class="material-symbols-outlined text-[14px]">male</span>
              <span>Putra</span>
            </button>
            <button class="filter-type-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors flex items-center gap-1 ${isTypeActive('putri')}" data-type="putri">
              <span class="material-symbols-outlined text-[14px]">female</span>
              <span>Putri</span>
            </button>
            <button class="filter-type-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors flex items-center gap-1 ${isTypeActive('campur')}" data-type="campur">
              <span class="material-symbols-outlined text-[14px]">group</span>
              <span>Campur</span>
            </button>

            <span class="h-4 w-[1px] bg-surface-container-high shrink-0 mx-1"></span>

            <!-- Facilities chips -->
            <button class="filter-facility-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors flex items-center gap-1 ${isFacilityActive('AC')}" data-facility="AC">
              <span class="material-symbols-outlined text-[14px]">ac_unit</span>
              <span>AC</span>
            </button>
            <button class="filter-facility-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors flex items-center gap-1 ${isFacilityActive('WiFi')}" data-facility="WiFi">
              <span class="material-symbols-outlined text-[14px]">wifi</span>
              <span>WiFi</span>
            </button>
            <button class="filter-facility-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors flex items-center gap-1 ${isFacilityActive('Kamar Mandi Dalam')}" data-facility="Kamar Mandi Dalam">
              <span class="material-symbols-outlined text-[14px]">bathtub</span>
              <span>KM Dalam</span>
            </button>
            <button class="filter-facility-btn shrink-0 px-3.5 py-1.5 rounded-full border border-surface-container transition-colors flex items-center gap-1 ${isFacilityActive('Water Heater')}" data-facility="Water Heater">
              <span class="material-symbols-outlined text-[14px]">water_drop</span>
              <span>Water Heater</span>
            </button>

            <!-- Reset Filter Button -->
            ${
              type || search || city || facilitiesParam.length > 0 || lat
                ? `
                  <a href="#/search" class="shrink-0 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors">
                    <span class="material-symbols-outlined text-[14px]">close</span>
                    <span>Reset Filter</span>
                  </a>
                `
                : ''
            }
          </div>
        </div>
      </div>

      <!-- MAIN SPLIT VIEW: LIST & INTERACTIVE MAP -->
      <div class="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row gap-6 relative">
        <!-- LEFT COLUMN: Listings (55%) -->
        <div id="listingContainer" class="w-full lg:w-[55%] flex flex-col gap-4">
          <!-- Counter & Context Header -->
          <div class="flex items-center justify-between">
            <h1 class="text-base sm:text-lg font-bold text-on-surface">
              Menampilkan <span class="text-primary">${totalCount} Kost</span>
              ${city || search ? `<span class="font-normal text-on-surface-variant text-sm">di "${search || city}"</span>` : ''}
              ${lat && lng ? `<span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ml-2">📍 Sekitar Lokasi GPS</span>` : ''}
            </h1>
          </div>

          <!-- Error Alert if any -->
          ${
            errorMsg
              ? `
                <div class="p-4 rounded-xl bg-error-container text-on-error-container text-sm">
                  ${errorMsg}
                </div>
              `
              : ''
          }

          <!-- Empty State -->
          ${
            properties.length === 0 && !errorMsg
              ? `
                <div class="bg-white rounded-2xl p-12 text-center border border-surface-container-high/60 my-6">
                  <div class="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline mx-auto mb-4">
                    <span class="material-symbols-outlined text-[32px]">apartment</span>
                  </div>
                  <h3 class="text-lg font-bold text-on-surface mb-1">Tidak ada kost yang cocok</h3>
                  <p class="text-sm text-on-surface-variant max-w-sm mx-auto mb-6">
                    Coba sesuaikan kata kunci pencarian, kurangi filter fasilitas, atau gunakan fitur lokasi GPS.
                  </p>
                  <a href="#/search" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors inline-block">
                    Lihat Semua Kost
                  </a>
                </div>
              `
              : ''
          }

          <!-- Property Cards List -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${properties
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
                  <div 
                    class="property-card bg-white rounded-2xl overflow-hidden border border-surface-container-high/60 shadow-sm hover:shadow-card hover:border-primary/40 transition-all flex flex-col group cursor-pointer"
                    data-id="${item.id}"
                    data-slug="${item.slug}"
                    data-lat="${item.latitude || ''}"
                    data-lng="${item.longitude || ''}"
                  >
                    <!-- Photo Header -->
                    <div class="relative h-44 overflow-hidden bg-surface-container">
                      <img 
                        src="${primaryPhoto}" 
                        alt="${item.name}" 
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${typeBadgeClass} shadow-sm backdrop-blur-md">
                          ${typeLabel}
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white shadow-sm flex items-center gap-0.5">
                          <span class="material-symbols-outlined text-[12px]">verified</span>
                          <span>Verifikasi</span>
                        </span>
                      </div>
                      ${
                        item.distanceKm !== undefined && item.distanceKm !== null
                          ? `
                            <div class="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1">
                              <span class="material-symbols-outlined text-[13px] text-emerald-400">near_me</span>
                              <span>${item.distanceKm} km</span>
                            </div>
                          `
                          : ''
                      }
                    </div>

                    <!-- Card Body -->
                    <div class="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div class="flex items-center gap-1 text-xs text-on-surface-variant mb-1">
                          <span class="material-symbols-outlined text-[15px] text-primary">location_on</span>
                          <span class="truncate">${item.district ? `${item.district}, ` : ''}${item.city || 'Indonesia'}</span>
                        </div>
                        <h3 class="font-bold text-sm sm:text-base text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                          ${item.name}
                        </h3>

                        <!-- Mini Facilities Chips -->
                        <div class="flex flex-wrap gap-1 mt-2.5">
                          ${item.facilities
                            .slice(0, 3)
                            .map(
                              (f) =>
                                `<span class="px-2 py-0.5 rounded bg-surface-container-low text-[10px] text-on-surface-variant font-medium">${f.facilityName}</span>`
                            )
                            .join('')}
                          ${
                            item.facilities.length > 3
                              ? `<span class="px-1.5 py-0.5 rounded bg-surface-container-low text-[10px] text-outline font-medium">+${item.facilities.length - 3}</span>`
                              : ''
                          }
                        </div>
                      </div>

                      <!-- Footer: Price & Room Count -->
                      <div class="border-t border-surface-container-low pt-3 mt-3 flex items-center justify-between">
                        <div>
                          <span class="text-[10px] text-outline block">Mulai</span>
                          <span class="text-sm sm:text-base font-bold text-primary font-sans">${formatRupiah(item.priceStart)}</span>
                          <span class="text-[10px] text-outline">/bln</span>
                        </div>
                        <span class="px-2.5 py-1 rounded-lg bg-surface-container-low text-primary text-[11px] font-semibold group-hover:bg-primary group-hover:text-white transition-colors">
                          Lihat Detail →
                        </span>
                      </div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- RIGHT COLUMN: Interactive Leaflet Map (45% default, expandable to full width or fullscreen modal) -->
        <div 
          id="mapContainerWrapper" 
          class="hidden lg:flex flex-col w-full lg:w-[45%] sticky top-44 h-[calc(100vh-200px)] rounded-2xl overflow-hidden border border-surface-container-high/60 shadow-card bg-surface-container transition-all duration-300 relative z-20"
        >
          <!-- Floating Map Control Toolbar -->
          <div class="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-xl shadow-md border border-surface-container-high">
            <button 
              id="btnExpandMap" 
              type="button"
              title="Perbesar Peta" 
              class="flex items-center gap-1 text-xs font-semibold text-on-surface hover:text-primary px-2 py-1 rounded-lg hover:bg-surface-container transition-colors"
            >
              <span id="expandMapIcon" class="material-symbols-outlined text-[18px]">open_in_full</span>
              <span id="expandMapText" class="hidden sm:inline">Perbesar Peta</span>
            </button>
            <button 
              id="btnResetMapZoom" 
              type="button"
              title="Pusatkan Peta" 
              class="flex items-center justify-center p-1.5 rounded-lg text-on-surface hover:text-primary hover:bg-surface-container transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">my_location</span>
            </button>
          </div>

          <div id="leafletMapContainer" class="w-full h-full"></div>
        </div>
      </div>
    </div>
  `;
}

export function setupSearchPageEvents(propertiesData: PropertyListItem[]) {
  // 1. Mobile Map Toggle
  const toggleBtn = document.getElementById('toggleMobileMapBtn');
  const mapWrapper = document.getElementById('mapContainerWrapper');
  const listContainer = document.getElementById('listingContainer');
  const btnText = document.getElementById('mobileMapBtnText');

  let isMobileMapVisible = false;
  if (toggleBtn && mapWrapper && listContainer) {
    toggleBtn.onclick = () => {
      isMobileMapVisible = !isMobileMapVisible;
      if (isMobileMapVisible) {
        mapWrapper.classList.remove('hidden');
        mapWrapper.classList.add('flex');
        listContainer.classList.add('hidden');
        if (btnText) btnText.textContent = 'Lihat Daftar';
        setTimeout(() => leafletMap?.invalidateSize(), 200);
      } else {
        mapWrapper.classList.add('hidden');
        mapWrapper.classList.remove('flex');
        listContainer.classList.remove('hidden');
        if (btnText) btnText.textContent = 'Lihat Peta';
      }
    };
  }

  // 2. Search & Filters Trigger
  const searchInput = document.getElementById('searchInputBar') as HTMLInputElement;
  const btnSearch = document.getElementById('btnApplySearch');

  const updateQueryParams = (newParams: { [key: string]: string | null }) => {
    const hash = window.location.hash;
    const parts = hash.split('?');
    const params = new URLSearchParams(parts[1] || '');

    for (const [key, val] of Object.entries(newParams)) {
      if (val === null || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    window.location.hash = `#/search?${params.toString()}`;
  };

  const executeSearch = () => {
    const val = searchInput?.value.trim() || '';
    updateQueryParams({ search: val, city: null });
  };

  if (btnSearch) btnSearch.onclick = executeSearch;
  if (searchInput) {
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') executeSearch();
    };
  }

  // Type filter buttons
  document.querySelectorAll('.filter-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = (btn as HTMLElement).dataset.type || '';
      updateQueryParams({ type: t });
    });
  });

  // Facility filter buttons
  document.querySelectorAll('.filter-facility-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const facility = (btn as HTMLElement).dataset.facility;
      if (!facility) return;

      const hash = window.location.hash;
      const parts = hash.split('?');
      const params = new URLSearchParams(parts[1] || '');
      const existing = params.getAll('facilities');

      if (existing.includes(facility)) {
        params.delete('facilities');
        existing.filter((f) => f !== facility).forEach((f) => params.append('facilities', f));
      } else {
        params.append('facilities', facility);
      }

      window.location.hash = `#/search?${params.toString()}`;
    });
  });

  // Sorting
  const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement;
  if (sortSelect) {
    sortSelect.onchange = () => {
      const sortVal = sortSelect.value;
      const cards = Array.from(document.querySelectorAll('.property-card')) as HTMLElement[];
      const container = document.querySelector('#listingContainer .grid') as HTMLElement;
      if (!container) return;

      if (sortVal === 'price_asc') {
        cards.sort((a, b) => {
          const pA = propertiesData.find((p) => p.id === a.dataset.id)?.priceStart || 0;
          const pB = propertiesData.find((p) => p.id === b.dataset.id)?.priceStart || 0;
          return Number(pA) - Number(pB);
        });
      } else if (sortVal === 'price_desc') {
        cards.sort((a, b) => {
          const pA = propertiesData.find((p) => p.id === a.dataset.id)?.priceStart || 0;
          const pB = propertiesData.find((p) => p.id === b.dataset.id)?.priceStart || 0;
          return Number(pB) - Number(pA);
        });
      }
      cards.forEach((c) => container.appendChild(c));
    };
  }

  // 3. Initialize Leaflet Map
  initLeafletMap(propertiesData);

  // 3b. Expand / Fullscreen Map Toggle
  const btnExpandMap = document.getElementById('btnExpandMap');
  const btnResetMapZoom = document.getElementById('btnResetMapZoom');
  const expandMapIcon = document.getElementById('expandMapIcon');
  const expandMapText = document.getElementById('expandMapText');
  let isMapExpanded = false;

  if (btnExpandMap && mapWrapper && listContainer) {
    btnExpandMap.onclick = () => {
      isMapExpanded = !isMapExpanded;
      if (isMapExpanded) {
        // Expand map: hide listing container or make map take 100%
        listContainer.classList.add('hidden');
        mapWrapper.classList.remove('lg:w-[45%]', 'sticky', 'top-44', 'h-[calc(100vh-200px)]');
        mapWrapper.classList.add('w-full', 'h-[calc(100vh-140px)]', 'min-h-[500px]');
        
        if (expandMapIcon) expandMapIcon.textContent = 'close_fullscreen';
        if (expandMapText) expandMapText.textContent = 'Kecilkan Peta';
        btnExpandMap.classList.add('bg-primary/10', 'text-primary');
      } else {
        // Restore split view
        listContainer.classList.remove('hidden');
        mapWrapper.classList.add('lg:w-[45%]', 'sticky', 'top-44', 'h-[calc(100vh-200px)]');
        mapWrapper.classList.remove('w-full', 'h-[calc(100vh-140px)]', 'min-h-[500px]');
        
        if (expandMapIcon) expandMapIcon.textContent = 'open_in_full';
        if (expandMapText) expandMapText.textContent = 'Perbesar Peta';
        btnExpandMap.classList.remove('bg-primary/10', 'text-primary');
      }
      setTimeout(() => {
        leafletMap?.invalidateSize();
      }, 300);
    };
  }

  if (btnResetMapZoom) {
    btnResetMapZoom.onclick = () => {
      if (!leafletMap) return;
      const validProps = propertiesData.filter((p) => p.latitude && p.longitude);
      if (validProps.length > 1) {
        const bounds = L.latLngBounds(validProps.map((p) => [Number(p.latitude), Number(p.longitude)]));
        leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (validProps.length === 1) {
        leafletMap.setView([Number(validProps[0].latitude), Number(validProps[0].longitude)], 14);
      }
    };
  }

  // 4. Card Click & Hover to Map Sync
  document.querySelectorAll('.property-card').forEach((card) => {
    const id = (card as HTMLElement).dataset.id;
    const slug = (card as HTMLElement).dataset.slug;

    card.addEventListener('click', () => {
      window.location.hash = `#/kost/${slug}`;
    });

    card.addEventListener('mouseenter', () => {
      if (id && mapMarkers[id]) {
        const marker = mapMarkers[id];
        const el = marker.getElement();
        if (el) el.querySelector('.custom-price-pin')?.classList.add('active');
      }
    });

    card.addEventListener('mouseleave', () => {
      if (id && mapMarkers[id]) {
        const marker = mapMarkers[id];
        const el = marker.getElement();
        if (el) el.querySelector('.custom-price-pin')?.classList.remove('active');
      }
    });
  });
}

function initLeafletMap(properties: PropertyListItem[]) {
  const container = document.getElementById('leafletMapContainer');
  if (!container) return;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
    mapMarkers = {};
  }

  // Default center: Indonesia / Padang
  let centerLat = -0.9242;
  let centerLng = 100.3831;
  let zoom = 12;

  // If there are properties with coords, calculate bounding
  const validProps = properties.filter((p) => p.latitude && p.longitude);

  if (validProps.length > 0) {
    centerLat = Number(validProps[0].latitude);
    centerLng = Number(validProps[0].longitude);
  }

  leafletMap = L.map('leafletMapContainer', {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([centerLat, centerLng], zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(leafletMap);

  const bounds = L.latLngBounds([]);

  validProps.forEach((prop) => {
    const pLat = Number(prop.latitude);
    const pLng = Number(prop.longitude);
    const compactPrice = formatCompactPrice(prop.priceStart);

    // Custom HTML Price Pin
    const customIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="custom-price-pin font-sans">${compactPrice}</div>`,
      iconSize: [80, 32],
      iconAnchor: [40, 16],
    });

    const marker = L.marker([pLat, pLng], { icon: customIcon }).addTo(leafletMap!);
    mapMarkers[prop.id] = marker;
    bounds.extend([pLat, pLng]);

    // Popup with thumbnail & link
    const primaryPhoto =
      prop.photos?.find((p) => p.isPrimary)?.url ||
      prop.photos?.[0]?.url ||
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

    const popupHtml = `
      <div class="w-64 font-sans text-on-surface">
        <div class="h-32 w-full overflow-hidden bg-surface-container">
          <img src="${primaryPhoto}" alt="${prop.name}" class="w-full h-full object-cover" />
        </div>
        <div class="p-3.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-primary">${prop.type} • ${prop.city || ''}</span>
          <h4 class="font-bold text-sm text-on-surface line-clamp-1 mt-0.5">${prop.name}</h4>
          <p class="text-xs text-primary font-bold mt-1">${formatRupiah(prop.priceStart)} <span class="text-[10px] font-normal text-outline">/bln</span></p>
          <a href="#/kost/${prop.slug}" class="mt-3 block text-center w-full py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors">
            Lihat Detail Kost
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 280 });
  });

  if (validProps.length > 1) {
    leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}
