import { state } from './state.js';

const KEY = 'tokyo_called_v1';

export function saveGame() {
  try {
    const data = {
      ...state,
      meta: { ...state.meta, saveDate: Date.now() },
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved?.meta?.version) return false;
    // Merge saved data into state
    Object.assign(state.meta,      saved.meta      || {});
    Object.assign(state.character, saved.character || {});
    Object.assign(state.time,      saved.time      || {});
    Object.assign(state.resources, saved.resources || {});
    Object.assign(state.language,  saved.language  || {});
    Object.assign(state.action, { id: null, startTime: null, duration: 0, label: '' });
    Object.assign(state.npcs.kenji, saved.npcs?.kenji || {});
    Object.assign(state.npcs.yuki,  saved.npcs?.yuki  || {});
    Object.assign(state.npcs.hiro,  saved.npcs?.hiro  || {});
    state.milestones.completed = saved.milestones?.completed || [];
    Object.assign(state.stats,  saved.stats  || {});
    Object.assign(state.flags, { muted: saved.flags?.muted || false, pendingNPCMeet: null, pendingMilestone: null });
    state.location = saved.location || 'apartment';
    return true;
  } catch (e) {
    console.warn('Load failed', e);
    return false;
  }
}

export function hasSave() {
  return !!localStorage.getItem(KEY);
}

export function resetGame() {
  localStorage.removeItem(KEY);
  window.location.reload();
}
