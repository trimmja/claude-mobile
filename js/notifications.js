// Sequential notification queue.
//
// Events from the engine (action complete, NPC meet, stage advance, milestone,
// payday, phase auto-advance, end of day, journal entry, unlocks, …) all
// enqueue here instead of firing on different UI surfaces directly.
//
// The queue shows ONE event at a time. The next event only fires after the
// current one is dismissed (tap, button, or auto-timeout). This fixes the
// race where end-of-day would cover a story popup, and the popup would only
// surface again after the day had already advanced.
//
// Renderers are registered at boot from main.js — they own the actual UI calls.
// This module just keeps order.

const queue = [];
let isShowing = false;
const renderers = {};

export function registerNotificationRenderer(type, fn) {
  renderers[type] = fn;
}

export function enqueueNotification(event) {
  queue.push(event);
  if (!isShowing) showNext();
}

export function clearNotificationQueue() {
  queue.length = 0;
  isShowing = false;
}

function showNext() {
  if (queue.length === 0) { isShowing = false; return; }
  const event = queue.shift();
  const render = renderers[event.type];
  if (!render) {
    console.warn('No renderer for notification type:', event.type);
    showNext();
    return;
  }
  isShowing = true;
  render(event, () => {
    isShowing = false;
    showNext();
  });
}
