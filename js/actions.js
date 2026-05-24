import { state } from './state.js';
import { spend, gain, spendEnergy, gainEnergy } from './resources.js';
import { addLangXP } from './language.js';
import { addNPCTrust, NPC_DEFS } from './npcs.js';

const DEEP_TALK_MIN_STAGE = 2; // Friend

// Unlock rules stay in code; numbers come from data/actions.json.
const ACTION_UNLOCK = {
  pray: () => true,
  rest: () => true,
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

// Actions completely hidden (not just locked) when conditions aren't met.
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
      energyCost: cfg.energyCost ?? 1,
      cost: cfg.cost || {},
      reward: cfg.reward || {},
      energyReward: cfg.energyReward || 0,
      npcChance: cfg.npcChance,
      unlockHint: cfg.unlockHint,
      unlocked: ACTION_UNLOCK[id] ?? (() => true),
      visible:  ACTION_VISIBLE[id] ?? (() => true),
      onComplete: ACTION_HOOKS[id],
    };
  }
}

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
    state.resources.energy.current,
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

// All visible activity IDs, in stable order — locations become flavor not nav.
export function allVisibleActions() {
  return Object.entries(ACTION_DEFS)
    .filter(([, def]) => def.visible())
    .map(([id]) => id);
}

// Communication actions that benefit from language level
const COMM_ACTIONS    = new Set(['hand_tracts', 'commuter_convo', 'casual_convo', 'host_english']);
const SPIRIT_ACTIONS  = new Set(['pray', 'study_scripture', 'observe_shrine']);
const NPC_VISIT_ACTIONS = new Set(['visit_kenji', 'visit_yuki', 'visit_hiro', 'deep_kenji', 'deep_yuki', 'deep_hiro']);

// Instant action. Returns { ok, id, bonuses, energySpent, reason }.
// ok=false reasons: 'locked' | 'energy' | 'cost' | 'unknown'
export function doAction(actionId) {
  const def = ACTION_DEFS[actionId];
  if (!def) return { ok: false, reason: 'unknown' };
  if (!def.unlocked()) return { ok: false, reason: 'locked' };

  // Energy first — cheaper to check
  if (!spendEnergy(def.energyCost)) return { ok: false, reason: 'energy' };

  // Then other costs. If they fail, refund energy.
  if (!spendCosts(def.cost)) {
    gainEnergy(def.energyCost);
    return { ok: false, reason: 'cost' };
  }

  const bonuses = applyRewards(actionId, def.reward);
  if (def.energyReward) gainEnergy(def.energyReward);
  if (def.onComplete) def.onComplete();

  state.stats.actionsCompleted++;
  state.time.actionsThisPhase++;

  // Update "last seen at" location for atmospheric continuity
  if (def.location) state.location = def.location;

  // NPC encounter roll
  if (def.npcChance) {
    const { id: npcId, chance } = def.npcChance;
    if (!state.npcs[npcId].met && Math.random() < chance) {
      state.npcs[npcId].met = true;
      state.flags.pendingNPCMeet = npcId;
    }
  }

  // Update lastSeenDay if we visited a known NPC
  const visitMatch = actionId.match(/^(?:visit|deep)_(\w+)$/);
  if (visitMatch) {
    const npcId = visitMatch[1];
    if (state.npcs[npcId]) state.npcs[npcId].lastSeenDay = state.time.day;
  }

  // Log for end-of-day summary
  const phase = state.time.phase;
  if (state.dayLog?.phases?.[phase]) {
    state.dayLog.phases[phase].push({ id: actionId, location: def.location });
  }

  return { ok: true, id: actionId, bonuses, energySpent: def.energyCost };
}

// ── internals ──────────────────────────────────────────────────

function spendCosts(costs) {
  if (!costs) return true;
  if (costs.faith  && state.resources.faith.current  < costs.faith)  return false;
  if (costs.money  && state.resources.money.current  < costs.money)  return false;
  if (costs.wisdom && state.resources.wisdom         < costs.wisdom) return false;
  if (costs.faith)  spend('faith',  costs.faith);
  if (costs.money)  spend('money',  costs.money);
  if (costs.wisdom) spend('wisdom', costs.wisdom);
  return true;
}

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

  if (COMM_ACTIONS.has(id) && reward.contacts && lang > 0) {
    const bonus = Math.floor(lang * 0.25 * reward.contacts);
    if (bonus > 0) { gain('contacts', bonus); bonuses.contacts = bonus; }
  }

  if (SPIRIT_ACTIONS.has(id) && reward.faith && wisdom > 0) {
    const bonus = Math.floor((wisdom / 100) * reward.faith);
    if (bonus > 0) { gain('faith', bonus); bonuses.faith = bonus; }
  }

  if (NPC_VISIT_ACTIONS.has(id) && reward.npcTrust) {
    const LANG_SCALE = [0.4, 0.7, 1.0, 1.0, 1.0, 1.0];
    const npcDef = NPC_DEFS[reward.npcTrust.id];
    const lw = npcDef?.langWeight ?? 1.0;
    const scale = LANG_SCALE[Math.min(lang, 5)];
    const langFactor = 1 - (lw * (1 - scale));
    const baseTrust = reward.npcTrust.amount;
    const delta = Math.round((langFactor - 1) * baseTrust);
    if (delta !== 0) addNPCTrust(reward.npcTrust.id, delta);
    if (lang >= 3) {
      const bonus = Math.floor((lang - 2) * 0.2 * baseTrust);
      if (bonus > 0) { addNPCTrust(reward.npcTrust.id, bonus); bonuses.npcTrust = bonus; }
    }
  }

  return bonuses;
}
