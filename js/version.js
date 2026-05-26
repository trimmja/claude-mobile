// Bump when you need phones to pick up a new build (shown in Settings).
export const APP_VERSION = '32';

const SKIP_CONTROLLER_RELOAD_KEY = 'jeb_skip_controller_reload';
const DEFER_SW_KEY = 'jeb_defer_sw';

/** Set before a manual hard refresh so we don't reload again when the new SW takes over. */
export function shouldSkipControllerReload() {
  if (!sessionStorage.getItem(SKIP_CONTROLLER_RELOAD_KEY)) return false;
  sessionStorage.removeItem(SKIP_CONTROLLER_RELOAD_KEY);
  return true;
}

/** After hard refresh, register the SW only once the page has fully loaded (iOS-safe). */
export function shouldDeferServiceWorker() {
  if (!sessionStorage.getItem(DEFER_SW_KEY)) return false;
  sessionStorage.removeItem(DEFER_SW_KEY);
  return true;
}

/** Remove old cache-bust query params left in the URL bar. */
export function cleanCacheBustParam() {
  const url = new URL(location.href);
  if (!url.searchParams.has('_')) return;
  url.searchParams.delete('_');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function showUpdateOverlay() {
  let el = document.getElementById('update-overlay');
  if (el) return;
  el = document.createElement('div');
  el.id = 'update-overlay';
  el.className = 'update-overlay';
  el.innerHTML = '<p class="update-overlay-text">Loading latest update…</p>';
  document.body.appendChild(el);
}

export async function hardRefreshApp() {
  const btn = document.getElementById('refresh-app-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating…';
  }
  showUpdateOverlay();
  sessionStorage.setItem(SKIP_CONTROLLER_RELOAD_KEY, '1');
  sessionStorage.setItem(DEFER_SW_KEY, '1');

  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }

  location.reload();
}
