// Event-driven engine for the phase + time + energy simulation.
// No setInterval — actions, phase transitions, and day transitions all fire explicitly
// from UI handlers (see main.js + ui.js).

import { state } from './state.js';
import { refillTime, refillEnergyDaily, applyStartOfDayFaith, checkPayday } from './resources.js';
import { doAction as runAction } from './actions.js';
import { checkMilestones } from './milestones.js';
import { saveGame } from './save.js';

const PHASE_ORDER = ['morning', 'afternoon', 'evening'];

// Callbacks set by main.js. Empty hooks (onBetweenPhases / onEndOfDay) are
// architected for future steps (NPC mood drift, weather refresh, emergent events).
export const hooks = {
  onActionComplete:  null, // ({ id, bonuses, timeSpent, energySpent }) => void
  onActionFailed:    null, // ({ id, reason }) => void
  onPhaseChange:     null, // ({ from, to, auto }) => void  (UI-facing)
  onBetweenPhases:   null, // ({ from, to }) => void  (future: mood drift, world refresh)
  onEndOfDayReady:   null, // ({ dayLog }) => void
  onEndOfDay:        null, // ({ dayLog }) => void  (future: emergent events)
  onNewDay:          null, // (day) => void
  onPayday:          null, // () => void
  onMilestone:       null, // (milestoneDef) => void
  onNPCMeet:         null, // (npcId) => void
  onLangLevelUp:     null, // (level) => void
};

export function doAction(actionId) {
  const result = runAction(actionId);
  if (!result.ok) {
    hooks.onActionFailed?.({ id: actionId, reason: result.reason });
    return result;
  }

  hooks.onActionComplete?.(result);

  if (state.flags.pendingNPCMeet) {
    hooks.onNPCMeet?.(state.flags.pendingNPCMeet);
    state.flags.pendingNPCMeet = null;
  }

  let m;
  while ((m = checkMilestones())) hooks.onMilestone?.(m);

  // If time is exhausted in this phase, auto-advance.
  if (state.time.remaining <= 0) {
    endPhase(true);
  }

  saveGame();
  return result;
}

// Move to the next phase. If we were in evening, set the end-of-day flag.
// `auto` = true if triggered by time running out (UI may show a toast).
export function endPhase(auto = false) {
  const from = state.time.phase;
  if (from === 'reflecting') return false;

  const idx = PHASE_ORDER.indexOf(from);

  if (idx === -1) {
    state.time.phase = 'morning';
    refillTime();
    state.time.actionsThisPhase = 0;
    hooks.onPhaseChange?.({ from, to: 'morning', auto });
    saveGame();
    return true;
  }

  if (idx < PHASE_ORDER.length - 1) {
    const to = PHASE_ORDER[idx + 1];
    state.time.phase = to;
    state.time.actionsThisPhase = 0;
    refillTime();                                // time refills per phase
    // NOTE: energy is NOT refilled — it's a daily pool
    hooks.onBetweenPhases?.({ from, to });
    hooks.onPhaseChange?.({ from, to, auto });
    saveGame();
    return true;
  }

  // Evening done — reflection mode.
  state.time.phase = 'reflecting';
  state.flags.pendingEndOfDay = true;
  hooks.onEndOfDay?.({ dayLog: state.dayLog });
  hooks.onEndOfDayReady?.({ dayLog: state.dayLog });
  saveGame();
  return true;
}

// Continue to next day.
export function endDay() {
  state.time.day++;
  state.stats.daysSurvived++;
  state.time.phase = 'morning';
  state.time.actionsThisPhase = 0;
  state.flags.pendingEndOfDay = false;
  state.dayLog = { phases: { morning: [], afternoon: [], evening: [] } };

  applyStartOfDayFaith();
  refillTime();
  refillEnergyDaily();                           // energy refills at start of new day only

  hooks.onNewDay?.(state.time.day);
  if (checkPayday()) hooks.onPayday?.();

  let m;
  while ((m = checkMilestones())) hooks.onMilestone?.(m);

  saveGame();
}
