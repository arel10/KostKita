import { renderNavbar, setupNavbarEvents } from './components/Navbar';
import { renderFooter } from './components/Footer';
import { renderHomePage, setupHomePageEvents } from './pages/HomePage';
import { renderSearchPage, setupSearchPageEvents } from './pages/SearchPage';
import { renderDetailPage, setupDetailPageEvents } from './pages/DetailPage';
import { fetchProperties } from './services/api';

export async function navigate() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawHash = window.location.hash.slice(1) || '/';
  const [routePath, queryString] = rawHash.split('?');
  const queryParams = new URLSearchParams(queryString || '');

  // Determine active page
  let activeNav: 'home' | 'search' | 'detail' = 'home';
  if (routePath.startsWith('/search')) activeNav = 'search';
  else if (routePath.startsWith('/kost/')) activeNav = 'detail';

  // Show loading indicator
  app.innerHTML = `
    ${renderNavbar(activeNav)}
    <main class="flex-1 flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs font-semibold text-outline font-sans">Memuat data KostKita...</p>
      </div>
    </main>
    ${renderFooter()}
  `;
  setupNavbarEvents();

  // Render requested page
  try {
    let pageHtml = '';
    let setupEvents: () => void = () => {};

    if (routePath === '/' || routePath === '') {
      pageHtml = await renderHomePage();
      setupEvents = setupHomePageEvents;
    } else if (routePath === '/search') {
      pageHtml = await renderSearchPage(queryParams);
      setupEvents = async () => {
        // Pre-fetch for map and list events
        const search = queryParams.get('search') || queryParams.get('city') || undefined;
        const type = queryParams.get('type') || undefined;
        const res = await fetchProperties({ search, type: type as any, perPage: 20 });
        setupSearchPageEvents(res.data);
      };
    } else if (routePath.startsWith('/kost/')) {
      const slug = routePath.replace('/kost/', '').trim();
      pageHtml = await renderDetailPage(slug);
      setupEvents = setupDetailPageEvents;
    } else {
      pageHtml = `
        <div class="max-w-md mx-auto py-24 text-center">
          <h2 class="text-2xl font-bold text-on-surface mb-2">Halaman Tidak Ditemukan</h2>
          <p class="text-sm text-on-surface-variant mb-6">Tautan yang Anda tuju mungkin salah atau telah dipindahkan.</p>
          <a href="#/" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold">Kembali ke Beranda</a>
        </div>
      `;
    }

    app.innerHTML = `
      ${renderNavbar(activeNav)}
      <main class="flex-1 w-full animate-fade-in">${pageHtml}</main>
      ${renderFooter()}
    `;

    setupNavbarEvents();
    setupEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err: any) {
    console.error('Navigation error:', err);
    app.innerHTML = `
      ${renderNavbar(activeNav)}
      <div class="max-w-md mx-auto py-24 text-center">
        <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined text-[24px]">warning</span>
        </div>
        <h2 class="text-xl font-bold text-on-surface mb-2">Terjadi Kesalahan</h2>
        <p class="text-sm text-on-surface-variant mb-6">${err.message || 'Tidak dapat memuat halaman.'}</p>
        <a href="#/" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold">Kembali ke Beranda</a>
      </div>
      ${renderFooter()}
    `;
    setupNavbarEvents();
  }
}
