import { state } from './state.js';
import { tick, advanceTime } from './resources.js';
import { completeAction, isActionComplete } from './actions.js';
import { checkMilestones } from './milestones.js';
import { saveGame } from './save.js';

let intervalId   = null;
let saveCountdown = 30;

// Callbacks set by main.js
export const hooks = {
  onActionComplete:  null, // (actionId) => void
  onNewDay:          null, // (day) => void
  onPayday:          null, // () => void
  onMilestone:       null, // (milestoneDef) => void
  onNPCMeet:         null, // (npcId) => void
  onLangLevelUp:     null, // (level) => void
};

export function startEngine() {
  if (intervalId) return;
  intervalId = setInterval(engineTick, 1000);
}

export function stopEngine() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

function engineTick() {
  // Advance day clock
  const newDay  = advanceTime();
  const payday  = tick();

  if (newDay && hooks.onNewDay) hooks.onNewDay(state.time.day);
  if (payday  && hooks.onPayday) hooks.onPayday();

  // Check action completion
  if (isActionComplete()) {
    const actionId = completeAction();
    if (hooks.onActionComplete) hooks.onActionComplete(actionId);

    // NPC meet
    if (state.flags.pendingNPCMeet && hooks.onNPCMeet) {
      hooks.onNPCMeet(state.flags.pendingNPCMeet);
      state.flags.pendingNPCMeet = null;
    }
  }

  // Check milestones
  const milestone = checkMilestones();
  if (milestone && hooks.onMilestone) {
    hooks.onMilestone(milestone);
  }

  // Auto-save every 30 ticks
  saveCountdown--;
  if (saveCountdown <= 0) {
    saveGame();
    saveCountdown = 30;
  }
}
