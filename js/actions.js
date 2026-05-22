import { state } from './state.js';
import { spend, gain } from './resources.js';
import { addLangXP } from './language.js';
import { addNPCTrust } from './npcs.js';
import { parseDuration } from './parseDuration.js';

// Unlock rules stay in code; numbers and durations come from data/actions.json.
const ACTION_UNLOCK = {
  pray: () => true,
  study_scripture: () => true,
  study_japanese: () => true,
  hand_tracts: () => true,
  commuter_convo: () => state.language.level >= 1,
  open_air_preach: () => true,
  casual_convo: () => true,
  host_english: () => state.resources.wisdom >= 10,
  observe_shrine: () => state.time.day >= 3,
  onsen_visit: () => state.resources.contacts >= 30,
  visit_kenji: () => state.npcs.kenji.met,
  visit_yuki: () => state.npcs.yuki.met,
  visit_hiro: () => state.npcs.hiro.met,
  deep_kenji: () => state.npcs.kenji.met && state.npcs.kenji.stage >= 2,
  deep_yuki: () => state.npcs.yuki.met && state.npcs.yuki.stage >= 2,
  deep_hiro: () => state.npcs.hiro.met && state.npcs.hiro.stage >= 2,
};

const ACTION_HOOKS = {
  onsen_visit: () => { state.stats.onsenVisited = true; },
};

export const ACTION_DEFS = {};

export function initActionsFromData(data) {
  const entries = data.actions || data;
  for (const id of Object.keys(ACTION_DEFS)) delete ACTION_DEFS[id];

  for (const [id, cfg] of Object.entries(entries)) {
    if (id.startsWith('_')) continue;
    ACTION_DEFS[id] = {
      location: cfg.location ?? null,
      icon: cfg.icon,
      duration: parseDuration(cfg.duration),
      cost: cfg.cost || {},
      reward: cfg.reward || {},
      npcChance: cfg.npcChance,
      unlockHint: cfg.unlockHint,
      unlocked: ACTION_UNLOCK[id] ?? (() => true),
      onComplete: ACTION_HOOKS[id],
    };
  }
}

// Returns action IDs available at the current location
export function actionsForLocation(locationId) {
  return Object.entries(ACTION_DEFS)
    .filter(([, def]) => def.location === locationId || def.location === null)
    .map(([id]) => id);
}

// Start an action. Returns false if not possible.
export function startAction(actionId) {
  if (state.action.id) return false;
  const def = ACTION_DEFS[actionId];
  if (!def) return false;
  if (!def.unlocked()) return false;
  if (!spendCosts(def.cost)) return false;

  state.action.id        = actionId;
  state.action.startTime = Date.now();
  state.action.duration  = def.duration;
  state.action.label     = actionId;
  return true;
}

export function cancelAction() {
  if (!state.action.id) return;
  // Refund half the faith cost
  const def = ACTION_DEFS[state.action.id];
  if (def?.cost?.faith) gain('faith', Math.floor(def.cost.faith / 2));
  clearAction();
}

// Called by engine when timer expires
export function completeAction() {
  const id  = state.action.id;
  const def = ACTION_DEFS[id];
  if (!def) { clearAction(); return null; }

  applyRewards(def.reward);
  if (def.onComplete) def.onComplete();

  state.stats.actionsCompleted++;
  clearAction();

  // NPC encounter roll
  if (def.npcChance) {
    const { id: npcId, chance } = def.npcChance;
    if (!state.npcs[npcId].met && Math.random() < chance) {
      state.npcs[npcId].met = true;
      state.flags.pendingNPCMeet = npcId;
    }
  }

  return id;
}

export function actionProgress() {
  if (!state.action.id || !state.action.startTime) return 0;
  return Math.min(1, (Date.now() - state.action.startTime) / state.action.duration);
}

export function isActionComplete() {
  return state.action.id && actionProgress() >= 1;
}

// ── internals ──────────────────────────────────────────────────

function spendCosts(costs) {
  if (!costs) return true;
  // Pre-check all costs before spending any
  if (costs.faith  && state.resources.faith.current  < costs.faith)  return false;
  if (costs.money  && state.resources.money.current  < costs.money)  return false;
  if (costs.wisdom && state.resources.wisdom         < costs.wisdom) return false;
  if (costs.faith)  spend('faith',  costs.faith);
  if (costs.money)  spend('money',  costs.money);
  if (costs.wisdom) spend('wisdom', costs.wisdom);
  return true;
}

function applyRewards(reward) {
  if (!reward) return;
  if (reward.faith)    gain('faith',    reward.faith);
  if (reward.contacts) gain('contacts', reward.contacts);
  if (reward.money)    gain('money',    reward.money);
  if (reward.wisdom)   gain('wisdom',   reward.wisdom);
  if (reward.langXP)   addLangXP(reward.langXP);
  if (reward.npcTrust) {
    addNPCTrust(reward.npcTrust.id, reward.npcTrust.amount);
  }
}

function clearAction() {
  state.action.id        = null;
  state.action.startTime = null;
  state.action.duration  = 0;
  state.action.label     = '';
}
