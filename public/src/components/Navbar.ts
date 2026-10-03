import { OWNER_ROUTES } from '../services/config';

export function renderNavbar(activePage: 'home' | 'search' | 'detail' = 'home'): string {
  return `
    <header class="sticky top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-surface-container-high/60 shadow-sm transition-all">
      <div class="h-20 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <!-- Logo & Navigation -->
        <div class="flex items-center gap-8">
          <a href="#/" class="flex items-center gap-3 group">
            <img src="/logo.png" alt="KostKita Logo" class="h-11 w-auto object-contain group-hover:scale-105 transition-transform" />
            <div class="flex flex-col">
              <span class="text-xl font-extrabold tracking-tight text-slate-900 font-sans leading-tight">Kost<span class="text-amber-500">Kita</span></span>
              <span class="text-[10px] font-semibold text-slate-400 tracking-wider">Cari Kost, Temukan Cerita</span>
            </div>
          </a>

          <nav class="hidden md:flex items-center gap-6 ml-2">
            <a href="#/search" class="text-sm font-medium transition-colors ${activePage === 'search'
      ? 'text-primary font-bold border-b-2 border-primary py-1'
      : 'text-on-surface-variant hover:text-primary'
    }">
              Cari Kost
            </a>
            <a href="#/search?city=Padang" class="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Padang
            </a>
            <a href="#/search?city=Sleman" class="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Yogyakarta
            </a>
            <a href="#/search?city=Depok" class="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Depok UI
            </a>
            <a href="#/search?city=Jakarta" class="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Jakarta
            </a>
          </nav>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3">
          <a href="${OWNER_ROUTES.login}" class="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined text-[18px]">lock</span>
            <span>Masuk Pemilik Kost</span>
          </a>
          <a href="${OWNER_ROUTES.register}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container shadow-sm hover:shadow transition-all">
            <span class="material-symbols-outlined text-[18px]">add_business</span>
            <span>Daftar Kelola Kost</span>
          </a>
          <!-- Mobile Menu Button -->
          <button id="mobileMenuBtn" class="md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low">
            <span class="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </div>
      </div>

      <!-- Mobile dropdown menu -->
      <div id="mobileMenu" class="hidden md:hidden px-4 pt-2 pb-4 border-t border-surface-container bg-white flex flex-col gap-2 animate-fade-in">
        <a href="#/search" class="px-3 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low">Cari Kost</a>
        <a href="#/search?city=Padang" class="px-3 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low">Kost Padang</a>
        <a href="#/search?city=Sleman" class="px-3 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low">Kost Jogja UGM</a>
        <a href="#/search?city=Depok" class="px-3 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low">Kost Depok UI</a>
        <a href="#/search?city=Jakarta" class="px-3 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low">Kost Jakarta Selatan</a>
        <hr class="border-surface-container my-1"/>
        <a href="${OWNER_ROUTES.login}" class="px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-surface-container-low">Masuk Pemilik Kost</a>
        <a href="${OWNER_ROUTES.register}" class="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-primary text-center">Daftar Kelola Kost</a>
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
}
