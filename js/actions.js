import { state } from './state.js';
import { spend, gain } from './resources.js';
import { addLangXP } from './language.js';
import { addNPCTrust } from './npcs.js';

// duration in milliseconds, cost/reward in game units
export const ACTION_DEFS = {
  // ── APARTMENT ──────────────────────────────────────────────
  pray: {
    location: 'apartment',
    icon: '🙏',
    duration: 30000,
    cost: {},
    reward: { faith: 15, wisdom: 1 },
    unlocked: () => true,
  },
  study_scripture: {
    location: 'apartment',
    icon: '📖',
    duration: 60000,
    cost: { faith: 5 },
    reward: { wisdom: 8, faith: 3 },
    unlocked: () => true,
  },
  study_japanese: {
    location: 'apartment',
    icon: '📝',
    duration: 90000,
    cost: { faith: 5 },
    reward: { langXP: 10 },
    unlocked: () => true,
  },

  // ── SHINJUKU STATION ────────────────────────────────────────
  hand_tracts: {
    location: 'station',
    icon: '📄',
    duration: 45000,
    cost: { faith: 10 },
    reward: { contacts: 2 },
    npcChance: { id: 'kenji', chance: 0.3 },
    unlocked: () => true,
  },
  commuter_convo: {
    location: 'station',
    icon: '💬',
    duration: 60000,
    cost: { faith: 15 },
    reward: { contacts: 1, langXP: 3 },
    unlocked: () => state.language.level >= 1,
    unlockHint: 'Requires Japanese Level 1',
  },

  // ── YOYOGI PARK ─────────────────────────────────────────────
  open_air_preach: {
    location: 'park',
    icon: '📢',
    duration: 120000,
    cost: { faith: 20 },
    reward: { contacts: 5, faith: 5 },
    npcChance: { id: 'hiro', chance: 0.35 },
    unlocked: () => true,
  },
  casual_convo: {
    location: 'park',
    icon: '☕',
    duration: 45000,
    cost: { faith: 5 },
    reward: { contacts: 1, langXP: 4 },
    unlocked: () => true,
  },

  // ── CAFÉ ────────────────────────────────────────────────────
  host_english: {
    location: 'cafe',
    icon: '🗣️',
    duration: 180000,
    cost: { faith: 10, money: 30 },
    reward: { contacts: 8, wisdom: 3, langXP: 2 },
    npcChance: { id: 'yuki', chance: 0.45 },
    unlocked: () => state.resources.wisdom >= 10,
    unlockHint: 'Requires Wisdom 10',
  },

  // ── SHRINE ──────────────────────────────────────────────────
  observe_shrine: {
    location: 'shrine',
    icon: '⛩️',
    duration: 60000,
    cost: {},
    reward: { wisdom: 5, langXP: 2 },
    npcChance: { id: 'hiro', chance: 0.25 },
    unlocked: () => state.time.day >= 3,
    unlockHint: 'Unlocks Day 3',
  },

  // ── ONSEN ───────────────────────────────────────────────────
  onsen_visit: {
    location: 'onsen',
    icon: '♨️',
    duration: 180000,
    cost: { money: 50 },
    reward: { wisdom: 10, langXP: 5 },
    unlocked: () => state.resources.contacts >= 30,
    unlockHint: 'Requires 30 Contacts',
    onComplete: () => { state.stats.onsenVisited = true; },
  },

  // ── NPC VISITS (available from any location when met) ───────
  visit_kenji: {
    location: null,
    icon: '👔',
    duration: 90000,
    cost: { faith: 10 },
    reward: { npcTrust: { id: 'kenji', amount: 12 } },
    unlocked: () => state.npcs.kenji.met,
  },
  visit_yuki: {
    location: null,
    icon: '📚',
    duration: 90000,
    cost: { faith: 10 },
    reward: { npcTrust: { id: 'yuki', amount: 12 } },
    unlocked: () => state.npcs.yuki.met,
  },
  visit_hiro: {
    location: null,
    icon: '🌿',
    duration: 90000,
    cost: { faith: 10 },
    reward: { npcTrust: { id: 'hiro', amount: 12 } },
    unlocked: () => state.npcs.hiro.met,
  },
  deep_kenji: {
    location: null,
    icon: '💛',
    duration: 120000,
    cost: { faith: 20 },
    reward: { npcTrust: { id: 'kenji', amount: 22 }, wisdom: 3 },
    unlocked: () => state.npcs.kenji.met && state.npcs.kenji.stage >= 2,
  },
  deep_yuki: {
    location: null,
    icon: '💛',
    duration: 120000,
    cost: { faith: 20 },
    reward: { npcTrust: { id: 'yuki', amount: 22 }, wisdom: 3 },
    unlocked: () => state.npcs.yuki.met && state.npcs.yuki.stage >= 2,
  },
  deep_hiro: {
    location: null,
    icon: '💛',
    duration: 120000,
    cost: { faith: 20 },
    reward: { npcTrust: { id: 'hiro', amount: 22 }, wisdom: 3 },
    unlocked: () => state.npcs.hiro.met && state.npcs.hiro.stage >= 2,
  },
};

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
