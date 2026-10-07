/**
 * KostKita Interactive Onboarding Tutorial / Product Tour
 * Designed exclusively for public visitors with step-by-step spotlight,
 * skip functionality, keyboard navigation, and responsive tooltips.
 */

export interface TourStep {
  id: string;
  targetSelector: string;
  mobileSelector?: string;
  title: string;
  subtitle: string;
  content: string;
  icon: string;
  badge: string;
  preferredPosition?: 'top' | 'bottom' | 'center';
}

const TOUR_STORAGE_KEY = 'kostkita_public_tour_seen_v1';

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '#navLogoLink',
    mobileSelector: '#navLogoLink',
    title: 'Selamat Datang di KostKita! 👋',
    subtitle: 'Platform Sewa Kost Modern & Terpercaya',
    content: 'KostKita membantu kamu mencari kost impian dengan mudah, transparan, dan tanpa biaya perantara. Kamu bisa langsung terhubung dengan pemilik kost resmi via WhatsApp!',
    icon: 'waving_hand',
    badge: 'Langkah 1 dari 5',
    preferredPosition: 'bottom',
  },
  {
    id: 'search',
    targetSelector: '#heroSearchForm',
    mobileSelector: '#heroSearchForm',
    title: 'Pencarian Cepat & Filter Lokasi 🔍',
    subtitle: 'Temukan Kost Sesuai Kebutuhanmu',
    content: 'Ketik nama kota, area, atau nama kampus (seperti UI, UGM, Unand). Kamu juga bisa klik tombol <b>"Gunakan Lokasi Saya"</b> untuk mencari kost terdekat berbasis GPS secara otomatis!',
    icon: 'travel_explore',
    badge: 'Langkah 2 dari 5',
    preferredPosition: 'bottom',
  },
  {
    id: 'recommended',
    targetSelector: '#featuredSection',
    mobileSelector: '#featuredSection',
    title: 'Rekomendasi Kost Terverifikasi 🏠',
    subtitle: 'Katalog Kost Pilihan Lengkap & Transparan',
    content: 'Di bagian ini kamu dapat melihat kost-kost terverifikasi lengkap dengan label tipe (Putri, Putra, Campur), fasilitas penting (AC, WiFi, Kamar Mandi Dalam), serta harga sewa per bulan.',
    icon: 'verified',
    badge: 'Langkah 3 dari 5',
    preferredPosition: 'top',
  },
  {
    id: 'promo',
    targetSelector: '#promoCarouselContainer',
    mobileSelector: '#promoCarouselContainer',
    title: 'Promo Menarik & Diskon Spesial 🎁',
    subtitle: 'Hemat Pengeluaran Sewa Kost Kamu',
    content: 'Dapatkan informasi diskon sewa bulanan, potongan khusus mahasiswa baru, dan beragam penawaran hemat lainnya lewat banner promo interaktif ini.',
    icon: 'percent',
    badge: 'Langkah 4 dari 5',
    preferredPosition: 'top',
  },
  {
    id: 'explore-map',
    targetSelector: '#navExploreLink',
    mobileSelector: '#mobileMenuBtn',
    title: 'Jelajahi Kost & Peta Digital 🗺️',
    subtitle: 'Eksplorasi Sebaran Kost di Peta Interaktif',
    content: 'Klik <b>"Jelajahi Kost"</b> untuk membuka peta digital interaktif, menyaring rentang budget, melihat foto kamar lengkap, dan langsung chat pemilik kost.',
    icon: 'map',
    badge: 'Langkah 5 dari 5',
    preferredPosition: 'bottom',
  },
];

class OnboardingTourManager {
  private currentStepIndex: number = 0;
  private isActive: boolean = false;
  private overlayEl: HTMLElement | null = null;
  private spotlightEl: HTMLElement | null = null;
  private cardEl: HTMLElement | null = null;
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundResizeHandler: (() => void) | null = null;

  public hasSeenTour(): boolean {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  }

  public markTourAsSeen(): void {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  }

  public resetTourSeen(): void {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }

  /**
   * Start tour. If force is false, only starts if user hasn't seen it yet.
   */
  public start(force: boolean = false): void {
    if (this.isActive) return;

    if (!force && this.hasSeenTour()) {
      return;
    }

    // Only run tour when on home page ('/' or empty hash)
    const hash = window.location.hash.slice(1) || '/';
    const [route] = hash.split('?');
    if (route !== '/' && route !== '') {
      if (force) {
        window.location.hash = '#/';
        setTimeout(() => this.start(true), 400);
      }
      return;
    }

    this.isActive = true;
    this.currentStepIndex = 0;
    this.createDomElements();
    this.bindGlobalEvents();
    this.goToStep(0);
  }

  public skip(): void {
    this.markTourAsSeen();
    this.cleanup();
    this.showToast('Tutorial dilewati. Kamu bisa membukanya kembali kapan saja lewat tombol "Panduan" di kanan bawah.');
  }

  public finish(): void {
    this.markTourAsSeen();
    this.cleanup();
    this.showToast('🎉 Selamat! Kamu siap menjelajahi KostKita.');
  }

  public next(): void {
    if (this.currentStepIndex < TOUR_STEPS.length - 1) {
      this.goToStep(this.currentStepIndex + 1);
    } else {
      this.finish();
    }
  }

  public prev(): void {
    if (this.currentStepIndex > 0) {
      this.goToStep(this.currentStepIndex - 1);
    }
  }

  public goToStep(index: number): void {
    if (index < 0 || index >= TOUR_STEPS.length) return;
    this.currentStepIndex = index;
    const step = TOUR_STEPS[index];

    // Determine target element
    const isMobile = window.innerWidth < 768;
    let target = isMobile && step.mobileSelector
      ? document.querySelector(step.mobileSelector) as HTMLElement
      : document.querySelector(step.targetSelector) as HTMLElement;

    if (!target) {
      target = document.querySelector(step.targetSelector) as HTMLElement;
    }

    if (target) {
      // Scroll target into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Render card content and update spotlight after small delay for smooth scroll
    setTimeout(() => {
      this.updateSpotlight(target);
      this.renderCard(step, target);
    }, 150);
  }

  private createDomElements(): void {
    // Backdrop Overlay
    const overlay = document.createElement('div');
    overlay.id = 'tourOverlay';
    overlay.className = 'fixed inset-0 z-[9990] bg-slate-950/65 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto';
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        // Clicking backdrop asks or skips gracefully
        this.skip();
      }
    };
    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    // Spotlight Highlight Box
    const spotlight = document.createElement('div');
    spotlight.id = 'tourSpotlight';
    spotlight.className = 'fixed z-[9992] pointer-events-none rounded-2xl transition-all duration-300 ease-out border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.65),0_0_30px_rgba(52,211,153,0.6)] ring-4 ring-emerald-300/40';
    document.body.appendChild(spotlight);
    this.spotlightEl = spotlight;

    // Tooltip Card Container
    const card = document.createElement('div');
    card.id = 'tourCard';
    card.className = 'fixed z-[9995] transition-all duration-300 ease-out';
    document.body.appendChild(card);
    this.cardEl = card;
  }

  private updateSpotlight(target: HTMLElement | null): void {
    if (!this.spotlightEl) return;

    if (!target) {
      // Center spotlight fallback
      this.spotlightEl.style.width = '0px';
      this.spotlightEl.style.height = '0px';
      this.spotlightEl.style.top = '50%';
      this.spotlightEl.style.left = '50%';
      return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 10;

    const top = Math.max(0, rect.top - pad);
    const left = Math.max(0, rect.left - pad);
    const width = rect.width + pad * 2;
    const height = rect.height + pad * 2;

    this.spotlightEl.style.top = `${top}px`;
    this.spotlightEl.style.left = `${left}px`;
    this.spotlightEl.style.width = `${width}px`;
    this.spotlightEl.style.height = `${height}px`;
    this.spotlightEl.style.borderRadius = rect.height < 50 ? '9999px' : '20px';
  }

  private renderCard(step: TourStep, target: HTMLElement | null): void {
    if (!this.cardEl) return;

    const progressPercent = Math.round(((this.currentStepIndex + 1) / TOUR_STEPS.length) * 100);
    const isFirst = this.currentStepIndex === 0;
    const isLast = this.currentStepIndex === TOUR_STEPS.length - 1;

    // Build Step dots
    const dotsHtml = TOUR_STEPS.map((_, i) => {
      const active = i === this.currentStepIndex;
      return `<button type="button" data-step-dot="${i}" class="w-2 h-2 rounded-full transition-all cursor-pointer ${
        active ? 'w-6 bg-[#004337]' : 'bg-slate-300 hover:bg-slate-400'
      }" aria-label="Lompat ke langkah ${i + 1}"></button>`;
    }).join('');

    this.cardEl.innerHTML = `
      <div class="relative bg-white text-slate-800 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,43,35,0.35)] border border-slate-200/90 w-[calc(100vw-32px)] sm:w-[440px] max-w-[440px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Top Gradient Accent Line & Progress Track -->
        <div class="w-full h-1.5 bg-slate-100 relative">
          <div class="h-full bg-gradient-to-r from-emerald-500 via-[#004337] to-amber-400 transition-all duration-300" style="width: ${progressPercent}%;"></div>
        </div>

        <div class="p-5 sm:p-6">
          <!-- Header Bar: Step Pill & Close / Skip Button -->
          <div class="flex items-center justify-between gap-2 mb-3.5">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#004337] border border-emerald-200/60 text-[11px] font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>${step.badge}</span>
            </div>

            <button 
              id="tourBtnClose" 
              type="button" 
              class="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Lewati Tutorial (Esc)"
              aria-label="Tutup Tutorial"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Title and Icon -->
          <div class="flex items-start gap-3 mb-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#004337] to-[#002b23] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#004337]/20">
              <span class="material-symbols-outlined text-[20px]">${step.icon}</span>
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                ${step.title}
              </h3>
              <p class="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                ${step.subtitle}
              </p>
            </div>
          </div>

          <!-- Body Description -->
          <div class="text-xs sm:text-sm text-slate-600 leading-relaxed my-3 font-normal">
            ${step.content}
          </div>

          <!-- Dots & Action Buttons Footer -->
          <div class="pt-4 border-t border-slate-100 flex flex-col gap-3">
            
            <div class="flex items-center justify-between">
              <!-- Dots Indicator -->
              <div class="flex items-center gap-1.5">
                ${dotsHtml}
              </div>

              <!-- Skip Link -->
              <button 
                id="tourBtnSkip" 
                type="button" 
                class="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer py-1 px-1"
              >
                Lewati Tutorial
              </button>
            </div>

            <!-- Main Buttons Row -->
            <div class="flex items-center justify-between gap-2.5 pt-1">
              ${
                !isFirst
                  ? `
                <button 
                  id="tourBtnPrev" 
                  type="button" 
                  class="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Sebelumnya</span>
                </button>
              `
                  : `<div class="text-[11px] text-slate-400 hidden sm:block">Tekan <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">Esc</kbd> untuk keluar</div>`
              }

              <button 
                id="tourBtnNext" 
                type="button" 
                class="flex-1 sm:flex-initial sm:min-w-[130px] h-10 px-5 rounded-xl bg-[#004337] hover:bg-[#00342b] active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer ml-auto"
              >
                <span>${isLast ? 'Selesai & Jelajahi' : 'Lanjut'}</span>
                <span class="material-symbols-outlined text-[16px]">${isLast ? 'check_circle' : 'arrow_forward'}</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    // Bind card buttons
    const btnClose = this.cardEl.querySelector('#tourBtnClose');
    if (btnClose) btnClose.addEventListener('click', () => this.skip());

    const btnSkip = this.cardEl.querySelector('#tourBtnSkip');
    if (btnSkip) btnSkip.addEventListener('click', () => this.skip());

    const btnNext = this.cardEl.querySelector('#tourBtnNext');
    if (btnNext) btnNext.addEventListener('click', () => this.next());

    const btnPrev = this.cardEl.querySelector('#tourBtnPrev');
    if (btnPrev) btnPrev.addEventListener('click', () => this.prev());

    // Bind dots
    this.cardEl.querySelectorAll('[data-step-dot]').forEach((dotBtn) => {
      dotBtn.addEventListener('click', (e) => {
        const targetDot = e.currentTarget as HTMLElement;
        const dotIndex = parseInt(targetDot.getAttribute('data-step-dot') || '0', 10);
        this.goToStep(dotIndex);
      });
    });

    // Position Card
    this.positionCard(target, step.preferredPosition);
  }

  private positionCard(target: HTMLElement | null, preferredPosition: 'top' | 'bottom' | 'center' = 'bottom'): void {
    if (!this.cardEl) return;

    const cardRect = this.cardEl.getBoundingClientRect();
    const cardWidth = cardRect.width || 420;
    const cardHeight = cardRect.height || 260;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // Mobile fallback: place card near bottom with safe area
    if (winWidth < 640) {
      this.cardEl.style.left = '16px';
      this.cardEl.style.right = '16px';
      this.cardEl.style.bottom = '20px';
      this.cardEl.style.top = 'auto';
      this.cardEl.style.transform = 'none';
      return;
    }

    if (!target) {
      // Center card
      this.cardEl.style.left = '50%';
      this.cardEl.style.top = '50%';
      this.cardEl.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const margin = 16;

    let top = 0;
    let left = rect.left + rect.width / 2 - cardWidth / 2;

    // Keep left within viewport margins
    if (left < 16) left = 16;
    if (left + cardWidth > winWidth - 16) left = winWidth - cardWidth - 16;

    // Decide vertical position
    const spaceBelow = winHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (preferredPosition === 'top') {
      if (spaceAbove > cardHeight + margin) {
        top = rect.top - cardHeight - margin;
      } else {
        top = rect.bottom + margin;
      }
    } else {
      if (spaceBelow > cardHeight + margin) {
        top = rect.bottom + margin;
      } else if (spaceAbove > cardHeight + margin) {
        top = rect.top - cardHeight - margin;
      } else {
        // Center vertically if both tight
        top = Math.max(16, (winHeight - cardHeight) / 2);
      }
    }

    // Safe bounds
    if (top < 16) top = 16;
    if (top + cardHeight > winHeight - 16) top = winHeight - cardHeight - 16;

    this.cardEl.style.left = `${left}px`;
    this.cardEl.style.top = `${top}px`;
    this.cardEl.style.bottom = 'auto';
    this.cardEl.style.right = 'auto';
    this.cardEl.style.transform = 'none';
  }

  private bindGlobalEvents(): void {
    // Keyboard navigation (Esc to skip, Arrows to navigate)
    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (!this.isActive) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.skip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        this.next();
      } else if (e.key === 'ArrowLeft') {
        this.prev();
      }
    };
    window.addEventListener('keydown', this.boundKeyHandler);

    // Resize handler
    this.boundResizeHandler = () => {
      if (!this.isActive) return;
      const step = TOUR_STEPS[this.currentStepIndex];
      const isMobile = window.innerWidth < 768;
      const target = isMobile && step.mobileSelector
        ? (document.querySelector(step.mobileSelector) as HTMLElement)
        : (document.querySelector(step.targetSelector) as HTMLElement);
      this.updateSpotlight(target);
      this.positionCard(target, step.preferredPosition);
    };
    window.addEventListener('resize', this.boundResizeHandler);
  }

  private cleanup(): void {
    this.isActive = false;

    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
    if (this.spotlightEl) {
      this.spotlightEl.remove();
      this.spotlightEl = null;
    }
    if (this.cardEl) {
      this.cardEl.remove();
      this.cardEl = null;
    }

    if (this.boundKeyHandler) {
      window.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
    if (this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.boundResizeHandler = null;
    }
  }

  private showToast(message: string): void {
    const existing = document.getElementById('tourToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'tourToast';
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl bg-slate-900/95 text-white text-xs sm:text-sm font-semibold shadow-2xl border border-slate-700/60 flex items-center gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none max-w-[90vw] text-center';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-emerald-400 text-[20px]">info</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease-out';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
}

export const onboardingTour = new OnboardingTourManager();

/**
 * Renders the floating Tour Help FAB in the bottom-right corner.
 * Users can click it at any time to replay the tutorial.
 */
export function renderTourFloatingButton(): string {
  return `
    <div id="tourFabContainer" class="fixed bottom-6 right-6 z-40 flex items-center group">
      <!-- Tooltip label on hover -->
      <span class="hidden sm:inline-block mr-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-[11px] font-semibold shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Butuh bantuan? Buka Panduan KostKita
      </span>

      <!-- Floating Button -->
      <button
        id="btnFloatingTour"
        type="button"
        aria-label="Panduan Penggunaan KostKita"
        class="h-12 px-4 rounded-full bg-gradient-to-r from-[#004337] to-[#006955] hover:from-[#00342b] hover:to-[#005243] text-white shadow-[0_8px_20px_rgba(0,67,55,0.35)] hover:shadow-[0_12px_28px_rgba(0,67,55,0.45)] border border-emerald-300/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
      >
        <span class="material-symbols-outlined text-[20px] text-amber-300 animate-bounce">tips_and_updates</span>
        <span class="text-xs font-bold tracking-tight">Panduan</span>
      </button>
    </div>
  `;
}

/**
 * Sets up events for the floating tour trigger button and navbar tour trigger.
 */
export function setupTourEvents(): void {
  const fab = document.getElementById('btnFloatingTour');
  if (fab) {
    fab.onclick = (e) => {
      e.preventDefault();
      onboardingTour.start(true);
    };
  }

  const navBtn = document.getElementById('btnNavStartTour');
  if (navBtn) {
    navBtn.onclick = (e) => {
      e.preventDefault();
      onboardingTour.start(true);
    };
  }

  const mobileTourBtn = document.getElementById('btnMobileStartTour');
  if (mobileTourBtn) {
    mobileTourBtn.onclick = (e) => {
      e.preventDefault();
      const mobileMenu = document.getElementById('mobileMenu');
      if (mobileMenu) mobileMenu.classList.add('hidden');
      onboardingTour.start(true);
    };
  }
}

/**
 * Initializes tour check: if first visit on homepage, launches automatically after a short delay.
 */
export function initOnboardingTour(): void {
  // Setup click triggers
  setupTourEvents();

  // If first-time user on homepage, start automatically after 700ms
  if (!onboardingTour.hasSeenTour()) {
    setTimeout(() => {
      onboardingTour.start(false);
    }, 700);
  }
}
