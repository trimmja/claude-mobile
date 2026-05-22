// Bump when you need phones to pick up a new build (shown in Settings).
export const APP_VERSION = '7';

const SKIP_CONTROLLER_RELOAD_KEY = 'jeb_skip_controller_reload';

/** Set before a manual hard refresh so we don't reload again when the new SW takes over. */
export function shouldSkipControllerReload() {
  if (!sessionStorage.getItem(SKIP_CONTROLLER_RELOAD_KEY)) return false;
  sessionStorage.removeItem(SKIP_CONTROLLER_RELOAD_KEY);
  return true;
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

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(resolve, ms)),
  ]);
}

export async function hardRefreshApp() {
  const btn = document.getElementById('refresh-app-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating…';
  }
  showUpdateOverlay();
  sessionStorage.setItem(SKIP_CONTROLLER_RELOAD_KEY, '1');

  await withTimeout((async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  })(), 2500);

  const url = new URL(location.href);
  url.searchParams.set('_', String(Date.now()));
  location.replace(url.pathname + url.search + url.hash);
}
