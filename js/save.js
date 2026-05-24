import { state } from './state.js';

const KEY = 'tokyo_called_v2';
const LEGACY_KEYS = ['tokyo_called_v1'];

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
  // One-time clear of legacy v1 saves (incompatible engine).
  LEGACY_KEYS.forEach(k => {
    if (localStorage.getItem(k)) localStorage.removeItem(k);
  });

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved?.meta?.version || saved.meta.version < 2) {
      localStorage.removeItem(KEY);
      return false;
    }

    Object.assign(state.meta,      saved.meta      || {});
    Object.assign(state.character, saved.character || {});

    // Time: ensure phase exists and is valid
    Object.assign(state.time, saved.time || {});
    if (!['morning', 'afternoon', 'evening', 'reflecting'].includes(state.time.phase)) {
      state.time.phase = 'morning';
    }
    if (typeof state.time.actionsThisPhase !== 'number') state.time.actionsThisPhase = 0;
    // Pre-time-mechanic saves: init time.remaining/max if missing
    if (typeof state.time.remaining !== 'number') state.time.remaining = state.time.max || 6;
    if (typeof state.time.max !== 'number')       state.time.max = 6;

    // Resources
    Object.assign(state.resources.faith,  saved.resources?.faith  || {});
    Object.assign(state.resources.money,  saved.resources?.money  || {});
    state.resources.contacts = saved.resources?.contacts ?? 0;
    state.resources.wisdom   = saved.resources?.wisdom   ?? 0;
    // Energy is now a daily pool. Carry current; clamp to (possibly larger) max from config.
    const savedEnergy = saved.resources?.energy || {};
    if (typeof savedEnergy.current === 'number') {
      state.resources.energy.current = savedEnergy.current;
    }
    // If the saved energy.max is smaller than current config (e.g., upgrade from per-phase 6 to daily 14),
    // applyTimingFromData will have already raised state.resources.energy.max — just clamp current.
    state.resources.energy.current = Math.min(
      state.resources.energy.max,
      state.resources.energy.current
    );

    Object.assign(state.language, saved.language || {});

    // NPCs — preserve lastSeenDay if saved
    ['kenji', 'yuki', 'hiro'].forEach(id => {
      Object.assign(state.npcs[id], saved.npcs?.[id] || {});
      if (state.npcs[id].lastSeenDay === undefined) state.npcs[id].lastSeenDay = null;
    });

    state.world = saved.world || {};
    state.milestones.completed = saved.milestones?.completed || [];
    Object.assign(state.stats, saved.stats || {});
    Object.assign(state.flags, {
      muted: saved.flags?.muted || false,
      pendingNPCMeet: null,
      pendingMilestone: null,
      pendingEndOfDay: saved.flags?.pendingEndOfDay || false,
    });
    state.location = saved.location || 'apartment';
    state.dayLog = saved.dayLog || { phases: { morning: [], afternoon: [], evening: [] } };

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
  LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
  window.location.reload();
}
