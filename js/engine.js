// Event-driven engine for the phase + time + energy simulation.
// No setInterval — actions, phase transitions, and day transitions all fire explicitly
// from UI handlers (see main.js + ui.js).

import { state } from './state.js';
import { refillTime, refillEnergyDaily, applyStartOfDayFaith, checkPayday } from './resources.js';
import { doAction as runAction } from './actions.js';
import { travelTo } from './locations.js';
import { checkMilestones } from './milestones.js';
import { checkUnlocks } from './unlocks.js';
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
  onNPCStageAdvance: null, // ({ npcId, newStage }) => void
  onLangLevelUp:     null, // (level) => void
  onTravel:          null, // ({ from, to, cost }) => void
};

export function doAction(actionId) {
  const result = runAction(actionId);
  if (!result.ok) {
    hooks.onActionFailed?.({ id: actionId, reason: result.reason });
    return result;
  }

  hooks.onActionComplete?.({ id: result.id, bonuses: result.bonuses, beat: result.beat, reward: result.reward, setback: result.setback, npcShift: result.npcShift, timeSpent: result.timeSpent, energySpent: result.energySpent });

  if (state.flags.pendingNPCMeet) {
    hooks.onNPCMeet?.(state.flags.pendingNPCMeet);
    state.flags.pendingNPCMeet = null;
  }

  // Fire NPC stage advances queued by addNPCTrust during applyRewards.
  // Process in FIFO order; clear the queue once drained.
  if (state.flags.pendingStageAdvances.length > 0) {
    const advances = state.flags.pendingStageAdvances.splice(0);
    for (const adv of advances) hooks.onNPCStageAdvance?.(adv);
  }

  // Language level-up queued by addLangXP during applyRewards.
  if (state.flags.pendingLangLevelUp > 0) {
    const newLevel = state.flags.pendingLangLevelUp;
    state.flags.pendingLangLevelUp = 0;
    hooks.onLangLevelUp?.(newLevel);
  }

  // Action unlocks may have flipped (e.g., wisdom just crossed 10 → host_english).
  // Check before milestones so unlock toasts queue before milestone toasts.
  checkUnlocks();

  let m;
  while ((m = checkMilestones())) hooks.onMilestone?.(m);

  // If time is exhausted in this phase, auto-advance.
  if (state.time.remaining <= 0) {
    endPhase(true);
  }

  saveGame();
  return result;
}

// Travel to a location. Spends time, changes state.location. Auto-advances phase if time runs out.
// Returns the same shape as travelTo from locations.js: { ok, reason?, cost? }.
export function doTravel(targetLoc) {
  const from = state.location;
  const result = travelTo(targetLoc);
  if (!result.ok) return result;

  hooks.onTravel?.({ from, to: targetLoc, cost: result.cost });

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
  state.location = 'apartment';                  // wake up at home each new day

  applyStartOfDayFaith();
  refillTime();
  refillEnergyDaily();                           // energy refills at start of new day only

  hooks.onNewDay?.(state.time.day);
  if (checkPayday()) hooks.onPayday?.();

  // Day-based unlocks (e.g., observe_shrine on day 3) and stat-based unlocks tied
  // to day start (faith refill, etc.) may have flipped.
  checkUnlocks();

  let m;
  while ((m = checkMilestones())) hooks.onMilestone?.(m);

  saveGame();
}
