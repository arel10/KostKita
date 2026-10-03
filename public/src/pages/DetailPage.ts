import L from 'leaflet';
import { fetchPropertyDetail, submitListingReport, formatRupiah, buildWhatsAppLink } from '../services/api';
import { PropertyDetail, Room } from '../types';

let selectedRoom: Room | null = null;
let currentProperty: PropertyDetail | null = null;
let detailMiniMap: L.Map | null = null;

export async function renderDetailPage(slug: string): Promise<string> {
  let property: PropertyDetail | null = null;
  let errorMsg = '';

  try {
    property = await fetchPropertyDetail(slug);
    currentProperty = property;
    // Default select first available room
    const availableRooms = property.rooms.filter((r) => r.status === 'available');
    selectedRoom = availableRooms.length > 0 ? availableRooms[0] : null;
  } catch (e: any) {
    errorMsg = e.message || 'Gagal memuat detail kost.';
  }

  if (errorMsg || !property) {
    return `
      <div class="max-w-[1360px] mx-auto px-4 py-20 text-center">
        <div class="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined text-[32px]">error</span>
        </div>
        <h2 class="text-xl font-bold text-on-surface mb-2">Kost Tidak Ditemukan</h2>
        <p class="text-sm text-on-surface-variant max-w-md mx-auto mb-6">${errorMsg}</p>
        <a href="#/search" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors inline-block">
          Kembali ke Pencarian
        </a>
      </div>
    `;
  }

  const primaryPhoto =
    property.photos?.find((p) => p.isPrimary)?.url ||
    property.photos?.[0]?.url ||
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

  const secondaryPhotos = property.photos.filter((p) => p.url !== primaryPhoto).slice(0, 4);

  const typeLabel =
    property.type === 'putri'
      ? 'Kost Putri'
      : property.type === 'putra'
        ? 'Kost Putra'
        : 'Kost Campur';

  const typeBadgeClass =
    property.type === 'putri'
      ? 'bg-rose-100 text-rose-800'
      : property.type === 'putra'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-emerald-100 text-emerald-800';

  const availableCount = property.rooms.filter((r) => r.status === 'available').length;

  return `
    <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full font-sans">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs text-on-surface-variant mb-6 overflow-x-auto whitespace-nowrap">
        <a href="#/" class="hover:text-primary transition-colors flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px]">home</span>
          <span>Beranda</span>
        </a>
        <span class="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
        <a href="#/search?city=${encodeURIComponent(property.city || '')}" class="hover:text-primary transition-colors">
          ${property.city || 'Indonesia'}
        </a>
        <span class="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
        <span class="text-on-surface font-semibold truncate max-w-xs">${property.name}</span>
      </nav>

      <!-- Property Header -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-surface-container-high/60">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${typeBadgeClass}">
              ${typeLabel}
            </span>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">verified</span>
              <span>Terverifikasi KostKita</span>
            </span>
          </div>

          <h1 class="text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">${property.name}</h1>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-on-surface-variant">
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[18px] text-primary">location_on</span>
              <span>${property.address}, ${property.district ? `${property.district}, ` : ''}${property.city || ''}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button id="btnShareDetail" class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors">
            <span class="material-symbols-outlined text-[18px]">share</span>
            <span>Bagikan</span>
          </button>
          <button id="btnBookmarkDetail" class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors">
            <span class="material-symbols-outlined text-[18px]" id="bookmarkIcon">bookmark_border</span>
            <span id="bookmarkLabel">Simpan</span>
          </button>
        </div>
      </section>

      <!-- Bento Photo Gallery Grid -->
      <section class="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2.5 h-[360px] md:h-[480px] rounded-2xl overflow-hidden my-6 shadow-sm relative">
        <!-- Big Hero Photo -->
        <div class="md:col-span-2 md:row-span-2 relative group overflow-hidden bg-surface-container cursor-pointer" id="galleryHeroPhoto">
          <img 
            src="${primaryPhoto}" 
            alt="Foto Utama ${property.name}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
          <div class="absolute bottom-4 left-4 text-white">
            <span class="px-2.5 py-1 rounded-full bg-primary/80 backdrop-blur-md text-[11px] font-semibold">Foto Utama</span>
            <p class="text-lg font-bold mt-1 text-white">${property.name}</p>
          </div>
        </div>

        <!-- Secondary Photos -->
        ${secondaryPhotos
      .map(
        (ph, idx) => `
            <div class="relative group overflow-hidden bg-surface-container hidden md:block cursor-pointer gallery-secondary-photo" data-idx="${idx + 1}">
              <img 
                src="${ph.url}" 
                alt="Foto ${idx + 2}" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          `
      )
      .join('')}

        <!-- View All Photos Badge Button -->
        <button id="btnOpenGalleryModal" class="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-primary px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all">
          <span class="material-symbols-outlined text-[18px]">photo_library</span>
          <span>Lihat Semua Foto (${property.photos.length})</span>
        </button>
      </section>

      <!-- MAIN TWO-COLUMN CONTENT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-4">
        <!-- Left Column: Details, Rooms, Facilities, Rules (8/12 cols) -->
        <div class="lg:col-span-8 space-y-8">
          <!-- Availability Strip -->
          <div class="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-surface-container">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-sm font-bold text-on-surface">
                ${availableCount > 0 ? `Tersedia ${availableCount} Kamar Siap Huni` : 'Semua Kamar Saat Ini Penuh'}
              </span>
            </div>
            <div class="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
              <span class="material-symbols-outlined text-[16px] text-primary">schedule</span>
              <span>Bisa langsung survey & check-in hari ini</span>
            </div>
          </div>

          <!-- Description -->
          <div class="space-y-3">
            <h2 class="text-lg font-bold text-on-surface">Tentang Kost Ini</h2>
            <p class="text-sm text-on-surface-variant leading-relaxed font-normal whitespace-pre-line">
              ${property.description || 'Kost nyaman dan strategis dengan fasilitas lengkap untuk mahasiswa dan profesional.'}
            </p>
          </div>

          <!-- Property Facilities -->
          <div class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">Fasilitas Kost Bersama</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${property.facilities
      .map(
        (f) => `
                <div class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-surface-container-high/60 shadow-xs">
                  <span class="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                  <span class="text-xs sm:text-sm font-medium text-on-surface">${f.facilityName}</span>
                </div>
              `
      )
      .join('')}
            </div>
          </div>

          <!-- ROOM LIST SELECTION SECTION -->
          <div class="space-y-4 pt-4 border-t border-surface-container-high/60" id="roomSection">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg sm:text-xl font-bold text-on-surface">Pilihan Tipe Kamar</h2>
                <p class="text-xs text-on-surface-variant">Pilih kamar yang Anda inginkan untuk cek ketersediaan & sewa</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-surface-container text-xs font-semibold text-primary">
                ${property.rooms.length} Total Kamar
              </span>
            </div>

            <div class="space-y-3">
              ${property.rooms
      .map((room) => {
        const isAvailable = room.status === 'available';
        const isSelected = selectedRoom?.id === room.id;
        const roomPhoto = room.photos?.[0]?.url || primaryPhoto;

        return `
                    <div 
                      class="room-card p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${!isAvailable
            ? 'bg-surface-container-low/50 opacity-60 border-surface-container pointer-events-none'
            : isSelected
              ? 'bg-white border-primary shadow-md ring-2 ring-primary/20'
              : 'bg-white border-surface-container-high/60 hover:border-primary/40 shadow-xs'
          }"
                      data-room-id="${room.id}"
                    >
                      <div class="flex items-center gap-4 w-full sm:w-auto">
                        <div class="w-20 h-20 rounded-xl overflow-hidden bg-surface-container shrink-0">
                          <img src="${roomPhoto}" alt="${room.name}" class="w-full h-full object-cover"/>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <h4 class="font-bold text-base text-on-surface">${room.name || `Kamar ${room.roomNumber}`}</h4>
                            <span class="text-[11px] px-2 py-0.5 rounded font-bold ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-outline'
          }">
                              ${isAvailable ? 'Tersedia' : 'Terisi'}
                            </span>
                          </div>
                          <p class="text-xs text-on-surface-variant mt-1 line-clamp-1">${room.description || 'Fasilitas kamar lengkap dan nyaman'}</p>
                          <div class="flex flex-wrap gap-1.5 mt-2">
                            ${(room.facilities || [])
            .map((rf) => `<span class="px-2 py-0.5 rounded bg-surface-container-low text-[10px] text-on-surface-variant font-medium">${rf.facilityName}</span>`)
            .join('')}
                          </div>
                        </div>
                      </div>

                      <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-surface-container">
                        <div class="text-left sm:text-right">
                          <span class="text-base font-bold text-primary font-sans">${formatRupiah(room.price)}</span>
                          <span class="text-xs text-outline">/bln</span>
                        </div>
                        <button 
                          type="button"
                          class="select-room-btn px-4 py-1.5 rounded-lg text-xs font-semibold mt-2 transition-colors ${isSelected
            ? 'bg-primary text-white'
            : 'bg-surface-container hover:bg-primary hover:text-white text-primary'
          }"
                        >
                          ${isSelected ? '✓ Terpilih' : 'Pilih Kamar'}
                        </button>
                      </div>
                    </div>
                  `;
      })
      .join('')}
            </div>
          </div>

          <!-- Rules -->
          ${property.rules.length > 0
      ? `
                <div class="space-y-4 pt-4 border-t border-surface-container-high/60">
                  <h2 class="text-lg font-bold text-on-surface">Peraturan Kost</h2>
                  <ul class="space-y-2.5">
                    ${property.rules
        .map(
          (r) => `
                      <li class="flex items-start gap-2.5 text-xs sm:text-sm text-on-surface-variant">
                        <span class="material-symbols-outlined text-outline text-[18px] shrink-0 mt-0.5">info</span>
                        <span>${r.rule}</span>
                      </li>
                    `
        )
        .join('')}
                  </ul>
                </div>
              `
      : ''
    }

          <!-- Accessibility & Mini Map -->
          <div class="space-y-4 pt-4 border-t border-surface-container-high/60">
            <h2 class="text-lg font-bold text-on-surface">Lokasi & Akses Sekitar</h2>
            <p class="text-xs sm:text-sm text-on-surface-variant">${property.address}, ${property.district ? `${property.district}, ` : ''}${property.city || ''}</p>
            <div id="detailMiniMapContainer" class="w-full h-72 rounded-2xl overflow-hidden border border-surface-container shadow-xs z-10"></div>
          </div>
        </div>

        <!-- Right Column: Sticky Floating Booking Card (4/12 cols) -->
        <div class="lg:col-span-4 sticky top-28 space-y-4">
          <div class="bg-white rounded-3xl p-6 border border-surface-container-high/60 shadow-card space-y-6">
            <div>
              <span class="text-xs text-outline font-medium block">Kamar yang Dipilih:</span>
              <h3 id="stickyRoomTitle" class="text-lg font-bold text-on-surface mt-0.5">
                ${selectedRoom ? selectedRoom.name || `Kamar ${selectedRoom.roomNumber}` : 'Pilih Kamar Terlebih Dahulu'}
              </h3>
              <div class="flex items-baseline gap-1 mt-2">
                <span id="stickyRoomPrice" class="text-2xl font-extrabold text-primary font-sans">
                  ${selectedRoom ? formatRupiah(selectedRoom.price) : formatRupiah(property.priceStart)}
                </span>
                <span class="text-xs text-outline">/ bulan</span>
              </div>
            </div>

            <hr class="border-surface-container"/>

            <!-- Direct WhatsApp CTA Button -->
            <div class="space-y-2">
              <a 
                id="btnDirectWhatsapp"
                href="${buildWhatsAppLink(
      property.whatsapp,
      property.name,
      selectedRoom?.name || `Kamar ${selectedRoom?.roomNumber || ''}`,
      selectedRoom?.price || property.priceStart
    )}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <span class="material-symbols-outlined text-[22px]">chat</span>
                <span>Tanya Kamar via WhatsApp</span>
              </a>
              <p class="text-[11px] text-center text-outline">
                Respon langsung dari Pemilik Kost resmi. Tanpa perantara.
              </p>
            </div>

            <!-- Report Button -->
            <div class="border-t border-surface-container pt-4">
              <button 
                id="btnOpenReportModal"
                class="w-full py-2 text-center text-xs font-medium text-outline hover:text-rose-600 transition-colors flex items-center justify-center gap-1"
              >
                <span class="material-symbols-outlined text-[16px]">flag</span>
                <span>Laporkan Listing / Informasi Salah</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PHOTO GALLERY LIGHTBOX MODAL -->
      <div id="galleryModal" class="hidden fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-fade-in">
        <div class="flex items-center justify-between text-white">
          <span class="text-sm font-semibold">${property.name} - Galeri Foto</span>
          <button id="btnCloseGalleryModal" class="p-2 text-white hover:text-rose-400">
            <span class="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>
        <div class="flex-1 flex items-center justify-center py-4">
          <img id="galleryModalActiveImg" src="${primaryPhoto}" class="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"/>
        </div>
        <div class="flex gap-2 overflow-x-auto justify-center pb-2">
          ${property.photos
      .map(
        (p, idx) => `
            <img 
              src="${p.url}" 
              class="w-16 h-16 rounded-xl object-cover cursor-pointer border-2 border-transparent hover:border-primary transition-all modal-thumb-img" 
              data-url="${p.url}"
            />
          `
      )
      .join('')}
        </div>
      </div>

      <!-- REPORT LISTING MODAL -->
      <div id="reportModal" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-surface-container relative">
          <button id="btnCloseReportModal" class="absolute top-5 right-5 text-outline hover:text-on-surface">
            <span class="material-symbols-outlined text-[24px]">close</span>
          </button>

          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">flag</span>
            </div>
            <div>
              <h3 class="text-lg font-bold text-on-surface">Laporkan Kost Ini</h3>
              <p class="text-xs text-on-surface-variant">Laporan Anda akan ditinjau oleh Super Admin KostKita</p>
            </div>
          </div>

          <form id="reportListingForm" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Alasan Pelaporan *</label>
              <select id="reportReason" required class="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs sm:text-sm border border-surface-container focus:bg-white focus:ring-2 focus:ring-primary">
                <option value="info_not_match">Informasi atau fasilitas tidak sesuai</option>
                <option value="whatsapp_inactive">Nomor WhatsApp tidak aktif / salah</option>
                <option value="not_available">Kamar sudah penuh tapi masih tayang</option>
                <option value="location_not_match">Titik peta / lokasi salah</option>
                <option value="fraud">Indikasi penipuan / fraud</option>
                <option value="inappropriate_content">Foto atau konten tidak pantas</option>
                <option value="other">Alasan lainnya</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Rincian Tambahan</label>
              <textarea id="reportDescription" rows="3" placeholder="Jelaskan secara singkat kendala yang Anda temukan..." class="w-full p-3 rounded-xl bg-surface-container-low text-xs sm:text-sm border border-surface-container focus:bg-white focus:ring-2 focus:ring-primary"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Nama Pelapor (Opsional)</label>
              <input type="text" id="reportName" placeholder="Nama Anda" class="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs sm:text-sm border border-surface-container focus:bg-white focus:ring-2 focus:ring-primary"/>
            </div>

            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Kontak Pelapor (Opsional)</label>
              <input type="text" id="reportContact" placeholder="Nomor WA / Email Anda" class="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs sm:text-sm border border-surface-container focus:bg-white focus:ring-2 focus:ring-primary"/>
            </div>

            <div class="pt-2 flex items-center justify-end gap-3">
              <button type="button" id="btnCancelReport" class="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-container">
                Batal
              </button>
              <button type="submit" id="btnSubmitReport" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-colors">
                Kirim Laporan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function setupDetailPageEvents() {
  if (!currentProperty) return;
  const prop = currentProperty;

  // 1. Room Selection Logic
  document.querySelectorAll('.room-card').forEach((card) => {
    card.addEventListener('click', () => {
      const roomId = (card as HTMLElement).dataset.roomId;
      const room = prop.rooms.find((r) => r.id === roomId);
      if (!room || room.status !== 'available') return;

      selectedRoom = room;

      // Update UI cards
      document.querySelectorAll('.room-card').forEach((rc) => {
        rc.classList.remove('ring-2', 'ring-primary/20', 'border-primary', 'shadow-md');
        rc.classList.add('border-surface-container-high/60');
        const btn = rc.querySelector('.select-room-btn');
        if (btn) {
          btn.textContent = 'Pilih Kamar';
          btn.className = 'select-room-btn px-4 py-1.5 rounded-lg text-xs font-semibold mt-2 transition-colors bg-surface-container hover:bg-primary hover:text-white text-primary';
        }
      });

      card.classList.add('ring-2', 'ring-primary/20', 'border-primary', 'shadow-md');
      card.classList.remove('border-surface-container-high/60');
      const activeBtn = card.querySelector('.select-room-btn');
      if (activeBtn) {
        activeBtn.textContent = '✓ Terpilih';
        activeBtn.className = 'select-room-btn px-4 py-1.5 rounded-lg text-xs font-semibold mt-2 transition-colors bg-primary text-white';
      }

      // Update Sticky Card
      const titleEl = document.getElementById('stickyRoomTitle');
      const priceEl = document.getElementById('stickyRoomPrice');
      const waBtn = document.getElementById('btnDirectWhatsapp') as HTMLAnchorElement;

      if (titleEl) titleEl.textContent = room.name || `Kamar ${room.roomNumber}`;
      if (priceEl) priceEl.textContent = formatRupiah(room.price);
      if (waBtn) {
        waBtn.href = buildWhatsAppLink(
          prop.whatsapp,
          prop.name,
          room.name || `Kamar ${room.roomNumber}`,
          room.price
        );
      }
    });
  });

  // 2. Share & Bookmark
  const btnShare = document.getElementById('btnShareDetail');
  if (btnShare) {
    btnShare.onclick = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: prop.name,
            text: `Temukan kost ${prop.name} di KostKita:`,
            url: window.location.href,
          });
        } catch (_) { }
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Tautan kost berhasil disalin ke clipboard!');
      }
    };
  }

  const btnBookmark = document.getElementById('btnBookmarkDetail');
  const bookmarkIcon = document.getElementById('bookmarkIcon');
  const bookmarkLabel = document.getElementById('bookmarkLabel');

  const bookmarks = JSON.parse(localStorage.getItem('kostkita_bookmarks') || '[]');
  const isBookmarked = bookmarks.includes(prop.id);
  if (isBookmarked && bookmarkIcon && bookmarkLabel) {
    bookmarkIcon.textContent = 'bookmark';
    bookmarkLabel.textContent = 'Tersimpan';
  }

  if (btnBookmark) {
    btnBookmark.onclick = () => {
      let bMarks = JSON.parse(localStorage.getItem('kostkita_bookmarks') || '[]');
      if (bMarks.includes(prop.id)) {
        bMarks = bMarks.filter((id: string) => id !== prop.id);
        if (bookmarkIcon) bookmarkIcon.textContent = 'bookmark_border';
        if (bookmarkLabel) bookmarkLabel.textContent = 'Simpan';
      } else {
        bMarks.push(prop.id);
        if (bookmarkIcon) bookmarkIcon.textContent = 'bookmark';
        if (bookmarkLabel) bookmarkLabel.textContent = 'Tersimpan';
      }
      localStorage.setItem('kostkita_bookmarks', JSON.stringify(bMarks));
    };
  }

  // 3. Mini Map for Property Coordinates
  initDetailMiniMap(prop);

  // 4. Photo Gallery Lightbox
  const galleryModal = document.getElementById('galleryModal');
  const btnOpenGallery = document.getElementById('btnOpenGalleryModal');
  const btnCloseGallery = document.getElementById('btnCloseGalleryModal');
  const galleryActiveImg = document.getElementById('galleryModalActiveImg') as HTMLImageElement;

  if (btnOpenGallery && galleryModal) {
    btnOpenGallery.onclick = () => galleryModal.classList.remove('hidden');
  }
  if (btnCloseGallery && galleryModal) {
    btnCloseGallery.onclick = () => galleryModal.classList.add('hidden');
  }

  document.querySelectorAll('.modal-thumb-img').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const url = (thumb as HTMLElement).dataset.url;
      if (url && galleryActiveImg) galleryActiveImg.src = url;
    });
  });

  // 5. Report Listing Modal
  const reportModal = document.getElementById('reportModal');
  const btnOpenReport = document.getElementById('btnOpenReportModal');
  const btnCloseReport = document.getElementById('btnCloseReportModal');
  const btnCancelReport = document.getElementById('btnCancelReport');
  const reportForm = document.getElementById('reportListingForm') as HTMLFormElement;

  if (btnOpenReport && reportModal) {
    btnOpenReport.onclick = () => reportModal.classList.remove('hidden');
  }
  const closeReport = () => reportModal?.classList.add('hidden');
  if (btnCloseReport) btnCloseReport.onclick = closeReport;
  if (btnCancelReport) btnCancelReport.onclick = closeReport;

  if (reportForm) {
    reportForm.onsubmit = async (e) => {
      e.preventDefault();
      const reason = (document.getElementById('reportReason') as HTMLSelectElement).value;
      const description = (document.getElementById('reportDescription') as HTMLTextAreaElement).value;
      const reporterName = (document.getElementById('reportName') as HTMLInputElement).value;
      const reporterContact = (document.getElementById('reportContact') as HTMLInputElement).value;

      try {
        await submitListingReport({
          propertyId: prop.id,
          reason,
          description,
          reporterName,
          reporterContact,
        });
        alert('Laporan Anda berhasil dikirimkan ke tim moderasi KostKita. Terima kasih!');
        closeReport();
        reportForm.reset();
      } catch (err: any) {
        alert(err.message || 'Gagal mengirim laporan.');
      }
    };
  }
}

function initDetailMiniMap(prop: PropertyDetail) {
  const container = document.getElementById('detailMiniMapContainer');
  if (!container || !prop.latitude || !prop.longitude) return;

  if (detailMiniMap) {
    detailMiniMap.remove();
    detailMiniMap = null;
  }

  const lat = Number(prop.latitude);
  const lng = Number(prop.longitude);

  detailMiniMap = L.map('detailMiniMapContainer', {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(detailMiniMap);

  const customIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div class="custom-price-pin active font-sans">📍 ${prop.name}</div>`,
    iconSize: [120, 32],
    iconAnchor: [60, 16],
  });

  L.marker([lat, lng], { icon: customIcon }).addTo(detailMiniMap);
}
