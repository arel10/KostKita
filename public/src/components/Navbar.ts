import { OWNER_ROUTES } from '../services/config';

export function renderNavbar(activePage: 'home' | 'search' | 'detail' = 'home'): string {
  return `
    <header class="sticky top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-surface-container-high/60 shadow-xs transition-all">
      <div class="h-20 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        <!-- Sisi Kiri: Logo & Navigasi Utama -->
        <div class="flex items-center gap-6 xl:gap-8">
          <a href="#/" class="flex items-center gap-3 group shrink-0">
            <img src="/logo.png" alt="KostKita Logo" class="h-10 w-auto object-contain group-hover:scale-105 transition-transform" />
            <div class="flex flex-col">
              <span class="text-xl font-extrabold tracking-tight text-slate-900 font-sans leading-tight">Kost<span class="text-amber-500">Kita</span></span>
              <span class="text-[10px] font-semibold text-slate-400 tracking-wider">Cari Kost, Temukan Cerita</span>
            </div>
          </a>

          <!-- Navigasi Desktop Fungsional -->
          <nav class="hidden md:flex items-center gap-1 xl:gap-2">
            <!-- Link Semua Kost -->
            <a 
              href="#/search" 
              class="px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activePage === 'search'
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }"
            >
              <span class="material-symbols-outlined text-[18px]">explore</span>
              <span>Jelajahi Kost</span>
            </a>

            <!-- Dropdown Kategori Kost Interaktif -->
            <div class="relative group">
              <button 
                type="button"
                id="navCategoryBtn"
                class="px-3 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[18px]">tune</span>
                <span>Kategori</span>
                <span class="material-symbols-outlined text-[16px] group-hover:rotate-180 transition-transform">expand_more</span>
              </button>

              <!-- Dropdown Menu Box -->
              <div class="absolute left-0 top-full pt-2 w-64 hidden group-hover:block animate-in fade-in zoom-in-95 duration-150 z-50">
                <div class="bg-white rounded-2xl shadow-xl border border-surface-container p-2 space-y-1">
                  <a href="#/search?type=putri" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors">
                    <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[18px]">female</span>
                    </div>
                    <div>
                      <span class="text-xs font-bold block">Kost Khusus Putri</span>
                      <span class="text-[10px] text-slate-400 block">Aman & gerbang 24 jam</span>
                    </div>
                  </a>

                  <a href="#/search?type=putra" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors">
                    <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[18px]">male</span>
                    </div>
                    <div>
                      <span class="text-xs font-bold block">Kost Khusus Putra</span>
                      <span class="text-[10px] text-slate-400 block">Parkir luas & fleksibel</span>
                    </div>
                  </a>

                  <a href="#/search?type=campur" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low text-slate-700 hover:text-primary transition-colors">
                    <div class="w-8 h-8 rounded-lg bg-surface-container text-slate-700 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[18px]">group</span>
                    </div>
                    <div>
                      <span class="text-xs font-bold block">Kost Campur</span>
                      <span class="text-[10px] text-slate-400 block">Pasutri & pekerja</span>
                    </div>
                  </a>

                  <div class="border-t border-slate-100 my-1"></div>

                  <a href="#/search?facilities=Kamar+Mandi+Dalam" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50 text-slate-700 hover:text-purple-700 transition-colors">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[18px]">shower</span>
                    </div>
                    <div>
                      <span class="text-xs font-bold block">Kamar Mandi Dalam</span>
                      <span class="text-[10px] text-slate-400 block">Bebas antre pagi</span>
                    </div>
                  </a>

                  <a href="#/search?facilities=AC" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 transition-colors">
                    <div class="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[18px]">ac_unit</span>
                    </div>
                    <div>
                      <span class="text-xs font-bold block">Ber-AC & WiFi Cepat</span>
                      <span class="text-[10px] text-slate-400 block">Siap WFH & belajar</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <!-- Link Peta Kost Interaktif -->
            <a 
              href="#/search" 
              class="px-3 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
            >
              <span class="material-symbols-outlined text-[18px] text-emerald-600">map</span>
              <span>Peta Kost</span>
            </a>
          </nav>
        </div>

        <!-- Tengah: Quick Search Bar di Navbar -->
        <div class="hidden lg:flex items-center flex-1 max-w-xs xl:max-w-sm mx-2">
          <form id="navbarSearchForm" class="w-full relative flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">search</span>
            <input 
              type="text" 
              id="navbarSearchInput"
              placeholder="Cari lokasi, kampus, atau nama kost..." 
              class="w-full h-9 pl-9 pr-8 rounded-full bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-primary focus:outline-none transition-all font-sans"
            />
            <button type="submit" class="absolute right-1 text-slate-400 hover:text-primary p-1 flex items-center cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </form>
        </div>

        <!-- Sisi Kanan: Action Buttons & Pemilik Kost -->
        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <a 
            href="${OWNER_ROUTES.login}" 
            class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-primary hover:bg-surface-container-low transition-colors"
          >
            <span class="material-symbols-outlined text-[17px] text-slate-400">lock</span>
            <span>Masuk Pemilik</span>
          </a>

          <a 
            href="${OWNER_ROUTES.register}" 
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-xs hover:shadow transition-all"
          >
            <span class="material-symbols-outlined text-[17px]">add_business</span>
            <span>Daftarkan Kost</span>
          </a>

          <!-- Mobile Menu Toggle Button -->
          <button 
            id="mobileMenuBtn" 
            type="button"
            class="md:hidden p-2 rounded-xl text-slate-700 hover:bg-surface-container-low cursor-pointer"
            aria-label="Buka Menu"
          >
            <span class="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      <div id="mobileMenu" class="hidden md:hidden px-4 pt-3 pb-6 border-t border-surface-container bg-white flex flex-col gap-3 animate-in fade-in duration-200 shadow-lg">
        <!-- Quick Search Mobile -->
        <form id="mobileSearchForm" class="relative flex items-center mb-1">
          <span class="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">search</span>
          <input 
            type="text" 
            id="mobileSearchInput"
            placeholder="Cari lokasi atau nama kost..." 
            class="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 focus:bg-white focus:outline-none focus:border-primary font-sans"
          />
        </form>

        <div class="space-y-1 text-xs font-bold text-slate-700">
          <span class="text-[10px] uppercase font-bold text-slate-400 px-3 tracking-wider block mb-1">Katalog & Peta</span>
          <a href="#/search" class="px-3 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-primary">explore</span>
            <span>Semua Pilihan Kost</span>
          </a>
          <a href="#/search" class="px-3 py-2.5 rounded-xl hover:bg-surface-container-low flex items-center gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-emerald-600">map</span>
            <span>Buka Peta Interaktif</span>
          </a>
        </div>

        <div class="space-y-1 text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">
          <span class="text-[10px] uppercase font-bold text-slate-400 px-3 tracking-wider block mb-1">Pilihan Kategori</span>
          <a href="#/search?type=putri" class="px-3 py-2 rounded-xl hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-rose-600">female</span>
            <span>Kost Khusus Putri</span>
          </a>
          <a href="#/search?type=putra" class="px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-blue-600">male</span>
            <span>Kost Khusus Putra</span>
          </a>
          <a href="#/search?type=campur" class="px-3 py-2 rounded-xl hover:bg-surface-container-low flex items-center gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-slate-600">group</span>
            <span>Kost Campur</span>
          </a>
          <a href="#/search?facilities=Kamar+Mandi+Dalam" class="px-3 py-2 rounded-xl hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-purple-600">shower</span>
            <span>Kamar Mandi Dalam</span>
          </a>
          <a href="#/search?facilities=AC" class="px-3 py-2 rounded-xl hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2.5">
            <span class="material-symbols-outlined text-[18px] text-cyan-600">ac_unit</span>
            <span>Ber-AC & WiFi Cepat</span>
          </a>
        </div>

        <div class="pt-3 border-t border-slate-100 flex flex-col gap-2">
          <a 
            href="${OWNER_ROUTES.login}" 
            class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 text-center hover:bg-surface-container-low"
          >
            Masuk Pemilik Kost
          </a>
          <a 
            href="${OWNER_ROUTES.register}" 
            class="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold text-center shadow-xs"
          >
            Daftarkan Kost Gratis
          </a>
        </div>
      </div>
    </header>
  `;
}

export function setupNavbarEvents() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (btn && menu) {
    btn.onclick = () => {
      menu.classList.toggle('hidden');
    };
  }

  // Desktop Navbar Quick Search Event
  const navForm = document.getElementById('navbarSearchForm') as HTMLFormElement;
  const navInput = document.getElementById('navbarSearchInput') as HTMLInputElement;
  if (navForm && navInput) {
    navForm.onsubmit = (e) => {
      e.preventDefault();
      const val = navInput.value.trim();
      if (val) {
        window.location.hash = `#/search?search=${encodeURIComponent(val)}`;
        navInput.value = '';
      } else {
        window.location.hash = '#/search';
      }
    };
  }

  // Mobile Quick Search Event
  const mobForm = document.getElementById('mobileSearchForm') as HTMLFormElement;
  const mobInput = document.getElementById('mobileSearchInput') as HTMLInputElement;
  if (mobForm && mobInput) {
    mobForm.onsubmit = (e) => {
      e.preventDefault();
      const val = mobInput.value.trim();
      if (menu) menu.classList.add('hidden');
      if (val) {
        window.location.hash = `#/search?search=${encodeURIComponent(val)}`;
        mobInput.value = '';
      } else {
        window.location.hash = '#/search';
      }
    };
  }
}
