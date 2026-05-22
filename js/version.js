// Bump when you need phones to pick up a new build (shown in Settings).
export const APP_VERSION = '5';

export async function hardRefreshApp() {
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
