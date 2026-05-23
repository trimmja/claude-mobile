import { state } from './state.js';
import { spend, gain } from './resources.js';
import { addLangXP } from './language.js';
import { addNPCTrust, NPC_DEFS } from './npcs.js';
import { parseDuration } from './parseDuration.js';

const DEEP_TALK_MIN_STAGE = 2; // Friend

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

// Actions that are completely hidden (not just locked) when conditions aren't met.
// NPC-specific actions must not appear until the NPC has been met.
const ACTION_VISIBLE = {
  visit_kenji: () => state.npcs.kenji.met,
  visit_yuki:  () => state.npcs.yuki.met,
  visit_hiro:  () => state.npcs.hiro.met,
  deep_kenji:  () => state.npcs.kenji.met,
  deep_yuki:   () => state.npcs.yuki.met,
  deep_hiro:   () => state.npcs.hiro.met,
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
      visible:  ACTION_VISIBLE[id] ?? (() => true),
      onComplete: ACTION_HOOKS[id],
    };
  }
}

// Human-readable requirements (always shown on gated actions).
export function getActionRequirements(actionId) {
  const reqs = REQUIREMENT_BUILDERS[actionId];
  return reqs ? reqs() : null;
}

export function actionUnlockCacheKey() {
  const n = state.npcs;
  return [
    state.language.level,
    state.time.day,
    state.resources.wisdom,
    state.resources.contacts,
    `k:${n.kenji.met}:${n.kenji.stage}`,
    `y:${n.yuki.met}:${n.yuki.stage}`,
    `h:${n.hiro.met}:${n.hiro.stage}`,
  ].join('|');
}

function reqMet(npcId) {
  const npc = state.npcs[npcId];
  const def = NPC_DEFS[npcId];
  const met = npc.met;
  return {
    label: `Meet ${def.name}`,
    met,
    detail: met ? 'Done' : 'Not met yet — meet them through outreach',
  };
}

function reqFriendStage(npcId) {
  const npc = state.npcs[npcId];
  const def = NPC_DEFS[npcId];
  const need = DEEP_TALK_MIN_STAGE;
  const met = npc.met && npc.stage >= need;
  const stageName = def.stages[npc.stage] ?? `Stage ${npc.stage}`;
  return {
    label: `Friend relationship with ${def.name}`,
    met,
    detail: npc.met
      ? (met ? 'Done' : `Now: ${stageName} (stage ${npc.stage}, need ${need}+)`)
      : 'Meet them first',
  };
}

function reqMin(label, current, need, fmt = v => String(v)) {
  const met = current >= need;
  return {
    label,
    met,
    detail: met ? 'Done' : `Now: ${fmt(current)} (need ${fmt(need)}+)`,
  };
}

const REQUIREMENT_BUILDERS = {
  commuter_convo: () => [
    reqMin('Japanese Level 1', state.language.level, 1, v => `Level ${v}`),
  ],
  host_english: () => [
    reqMin('Wisdom 10', state.resources.wisdom, 10),
  ],
  observe_shrine: () => [
    reqMin('Day 3 in Tokyo', state.time.day, 3, v => `Day ${v}`),
  ],
  onsen_visit: () => [
    reqMin('30 contacts', state.resources.contacts, 30),
  ],
  visit_kenji: () => [reqMet('kenji')],
  visit_yuki: () => [reqMet('yuki')],
  visit_hiro: () => [reqMet('hiro')],
  deep_kenji: () => [reqMet('kenji'), reqFriendStage('kenji')],
  deep_yuki: () => [reqMet('yuki'), reqFriendStage('yuki')],
  deep_hiro: () => [reqMet('hiro'), reqFriendStage('hiro')],
};

// Returns action IDs available at the current location
export function actionsForLocation(locationId) {
  return Object.entries(ACTION_DEFS)
    .filter(([, def]) => (def.location === locationId || def.location === null) && def.visible())
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

// Communication actions that benefit from language level
const COMM_ACTIONS    = new Set(['hand_tracts', 'commuter_convo', 'casual_convo', 'host_english']);
// Spiritual actions that benefit from wisdom
const SPIRIT_ACTIONS  = new Set(['pray', 'study_scripture', 'observe_shrine']);
// NPC visit actions that benefit from language level (trust bonus)
const NPC_VISIT_ACTIONS = new Set(['visit_kenji', 'visit_yuki', 'visit_hiro', 'deep_kenji', 'deep_yuki', 'deep_hiro']);

// Called by engine when timer expires.
// Returns { id, bonuses } where bonuses is an object of { contacts?, faith?, npcTrust? }.
export function completeAction() {
  const id  = state.action.id;
  const def = ACTION_DEFS[id];
  if (!def) { clearAction(); return null; }

  const bonuses = applyRewards(id, def.reward);
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

  return { id, bonuses };
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

// Applies base rewards and stat bonuses. Returns bonus amounts for display.
function applyRewards(id, reward) {
  if (!reward) return {};

  if (reward.faith)    gain('faith',    reward.faith);
  if (reward.contacts) gain('contacts', reward.contacts);
  if (reward.money)    gain('money',    reward.money);
  if (reward.wisdom)   gain('wisdom',   reward.wisdom);
  if (reward.langXP)   addLangXP(reward.langXP);
  if (reward.npcTrust) addNPCTrust(reward.npcTrust.id, reward.npcTrust.amount);

  const bonuses = {};
  const lang    = state.language.level;
  const wisdom  = state.resources.wisdom;

  // Language bonus: communication actions gain +contacts
  if (COMM_ACTIONS.has(id) && reward.contacts && lang > 0) {
    const bonus = Math.floor(lang * 0.25 * reward.contacts);
    if (bonus > 0) { gain('contacts', bonus); bonuses.contacts = bonus; }
  }

  // Wisdom bonus: spiritual actions gain +faith
  if (SPIRIT_ACTIONS.has(id) && reward.faith && wisdom > 0) {
    const bonus = Math.floor((wisdom / 100) * reward.faith);
    if (bonus > 0) { gain('faith', bonus); bonuses.faith = bonus; }
  }

  // Language bonus: NPC visit actions gain +trust
  if (NPC_VISIT_ACTIONS.has(id) && reward.npcTrust && lang > 0) {
    const bonus = Math.floor(lang * 0.2 * reward.npcTrust.amount);
    if (bonus > 0) { addNPCTrust(reward.npcTrust.id, bonus); bonuses.npcTrust = bonus; }
  }

  return bonuses;
}

function clearAction() {
  state.action.id        = null;
  state.action.startTime = null;
  state.action.duration  = 0;
  state.action.label     = '';
}
