import { state } from './state.js';
import { MILESTONE_DEFS } from './milestones.js';
import { initNPCMoodStats, initNPCRoleProgress } from './npcs.js';

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
    // v32 migration: spiritDry defaults to 0 if save predates the field.
    if (typeof state.character.spiritDry !== 'number') state.character.spiritDry = 0;

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

    // NPCs — preserve lastSeenDay + mood/stress/burden if saved
    ['kenji', 'yuki', 'hiro'].forEach(id => {
      Object.assign(state.npcs[id], saved.npcs?.[id] || {});
      if (state.npcs[id].lastSeenDay === undefined) state.npcs[id].lastSeenDay = null;
      // Step 2 migration: init mood/stress/burden/firedEvents if save predates this feature
      initNPCMoodStats(id);
      // Phase C migration: per-NPC flags object (carryover for callback beats)
      if (!state.npcs[id].flags || typeof state.npcs[id].flags !== 'object') {
        state.npcs[id].flags = {};
      }
      // D1 migration: roleProgress counters (Elder-stage gates) default to 0 for pre-v35 saves
      initNPCRoleProgress(id);
    });

    state.world = saved.world || {};
    state.milestones.completed = saved.milestones?.completed || [];
    state.journal = Array.isArray(saved.journal) ? saved.journal : [];

    // Backfill journal from completed milestones for saves made before the journal existed.
    // Day/phase aren't recoverable for historical milestones — use day 1, morning as a placeholder.
    if (state.journal.length === 0 && state.milestones.completed.length > 0) {
      state.milestones.completed.forEach(milestoneId => {
        const def = MILESTONE_DEFS.find(m => m.id === milestoneId);
        if (!def) return;
        state.journal.push({
          id: `milestone_${def.id}`,
          day: 1,
          phase: 'morning',
          icon: def.icon,
          title: def.name,
          body: def.desc || 'You reached this milestone.',
          type: 'milestone',
        });
      });
    }
    Object.assign(state.stats, saved.stats || {});
    Object.assign(state.flags, {
      muted: saved.flags?.muted || false,
      pendingNPCMeet: null,
      pendingMilestone: null,
      pendingEndOfDay: saved.flags?.pendingEndOfDay || false,
      pendingStageAdvances: [],
      pendingLangLevelUp: 0,
      unreadJournalCount: saved.flags?.unreadJournalCount ?? 0,
      notifiedUnlocks: Array.isArray(saved.flags?.notifiedUnlocks) ? saved.flags.notifiedUnlocks : [],
      // Phase C migration: lastBeatByAction starts empty for pre-v34 saves
      lastBeatByAction: (saved.flags?.lastBeatByAction && typeof saved.flags.lastBeatByAction === 'object')
        ? saved.flags.lastBeatByAction
        : {},
    });
    state.location = saved.location || 'apartment';
    // Phase C migration: dayLog gains startContacts + per-day event flags
    const savedDayLog = saved.dayLog || {};
    state.dayLog = {
      phases: savedDayLog.phases || { morning: [], afternoon: [], evening: [] },
      startContacts:     typeof savedDayLog.startContacts     === 'number'  ? savedDayLog.startContacts     : state.resources.contacts,
      paydayToday:       savedDayLog.paydayToday       === true,
      setbackToday:      savedDayLog.setbackToday      === true,
      langLevelUpToday:  savedDayLog.langLevelUpToday  === true,
    };

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
