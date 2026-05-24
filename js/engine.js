// Event-driven engine for the phase + energy simulation.
// No setInterval — actions, phase transitions, and day transitions all fire explicitly
// from UI handlers (see main.js + ui.js).

import { state } from './state.js';
import { refillEnergy, applyStartOfDayFaith, checkPayday } from './resources.js';
import { doAction as runAction } from './actions.js';
import { checkMilestones } from './milestones.js';
import { saveGame } from './save.js';

const PHASE_ORDER = ['morning', 'afternoon', 'evening'];

// Callbacks set by main.js. Empty hooks (onBetweenPhases / onEndOfDay) are
// architected for future steps (NPC mood drift, weather refresh, emergent events).
export const hooks = {
  onActionComplete:  null, // ({ id, bonuses, energySpent }) => void
  onActionFailed:    null, // ({ id, reason }) => void
  onPhaseChange:     null, // ({ from, to }) => void  (UI-facing)
  onBetweenPhases:   null, // ({ from, to }) => void  (future: mood drift, world refresh)
  onEndOfDayReady:   null, // ({ dayLog }) => void   (UI shows reflection screen)
  onEndOfDay:        null, // ({ dayLog }) => void   (future: emergent events; fires before screen)
  onNewDay:          null, // (day) => void
  onPayday:          null, // () => void
  onMilestone:       null, // (milestoneDef) => void
  onNPCMeet:         null, // (npcId) => void
  onLangLevelUp:     null, // (level) => void
};

// Run an action. Returns the same shape doAction returns.
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

  // Milestones may fire mid-phase
  let m;
  while ((m = checkMilestones())) hooks.onMilestone?.(m);

  // If energy is now zero, auto-end phase.
  if (state.resources.energy.current <= 0) {
    endPhase();
  }

  saveGame();
  return result;
}

// Move to the next phase. If we were in evening, set the end-of-day flag.
export function endPhase() {
  const from = state.time.phase;
  if (from === 'reflecting') return false;

  const idx = PHASE_ORDER.indexOf(from);

  if (idx === -1) {
    // Defensive: bad state, reset to morning
    state.time.phase = 'morning';
    refillEnergy();
    state.time.actionsThisPhase = 0;
    hooks.onPhaseChange?.({ from, to: 'morning' });
    saveGame();
    return true;
  }

  if (idx < PHASE_ORDER.length - 1) {
    const to = PHASE_ORDER[idx + 1];
    state.time.phase = to;
    state.time.actionsThisPhase = 0;
    refillEnergy();
    hooks.onBetweenPhases?.({ from, to });   // future: NPC mood drift, weather check
    hooks.onPhaseChange?.({ from, to });
    saveGame();
    return true;
  }

  // We were in evening — switch to reflection mode and tell UI to show the end-of-day screen.
  state.time.phase = 'reflecting';
  state.flags.pendingEndOfDay = true;
  hooks.onEndOfDay?.({ dayLog: state.dayLog });   // future: emergent events
  hooks.onEndOfDayReady?.({ dayLog: state.dayLog });
  saveGame();
  return true;
}

// Advance to next day. Called from end-of-day screen "Continue" button.
export function endDay() {
  state.time.day++;
  state.stats.daysSurvived++;
  state.time.phase = 'morning';
  state.time.actionsThisPhase = 0;
  state.flags.pendingEndOfDay = false;
  state.dayLog = { phases: { morning: [], afternoon: [], evening: [] } };

  applyStartOfDayFaith();
  refillEnergy();

  hooks.onNewDay?.(state.time.day);
  if (checkPayday()) hooks.onPayday?.();

  let m;
  while ((m = checkMilestones())) hooks.onMilestone?.(m);

  saveGame();
}
