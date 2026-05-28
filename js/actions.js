import { state } from './state.js';
import { spend, gain, lose, spendEnergy, gainEnergy, spendTime, gainTime, adjustSpiritDry } from './resources.js';
import { addLangXP } from './language.js';
import { addNPCTrust, NPC_DEFS, adjustNPC, calcVisitMoodDelta } from './npcs.js';
import { getStoryBeat } from './stories.js';

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
  evening_kenji:   () => state.npcs.kenji.met && state.npcs.kenji.stage >= 2 && state.npcs.kenji.stage < 5,
  questions_yuki:  () => state.npcs.yuki.met  && state.npcs.yuki.stage  >= 2 && state.npcs.yuki.stage  < 5,
  pray_hiro:       () => state.npcs.hiro.met  && state.npcs.hiro.stage  >= 2 && state.npcs.hiro.stage  < 5,
  disciple_kenji:  () => state.npcs.kenji.met && state.npcs.kenji.stage >= 5,
  disciple_yuki:   () => state.npcs.yuki.met  && state.npcs.yuki.stage  >= 5,
  disciple_hiro:   () => state.npcs.hiro.met  && state.npcs.hiro.stage  >= 5,
};

const ACTION_HOOKS = {
  onsen_visit: () => { state.stats.onsenVisited = true; },
};

// Actions completely hidden (not just locked) when conditions aren't met.
// Pre-conversion deep actions hide once the NPC is a Believer (stage 5+) so the
// disciple_* card takes their slot — one deep action per NPC at any time.
const ACTION_VISIBLE = {
  visit_kenji:    () => state.npcs.kenji.met,
  visit_yuki:     () => state.npcs.yuki.met,
  visit_hiro:     () => state.npcs.hiro.met,
  evening_kenji:  () => state.npcs.kenji.met && state.npcs.kenji.stage < 5,
  questions_yuki: () => state.npcs.yuki.met  && state.npcs.yuki.stage  < 5,
  pray_hiro:      () => state.npcs.hiro.met  && state.npcs.hiro.stage  < 5,
  disciple_kenji: () => state.npcs.kenji.met && state.npcs.kenji.stage >= 5,
  disciple_yuki:  () => state.npcs.yuki.met  && state.npcs.yuki.stage  >= 5,
  disciple_hiro:  () => state.npcs.hiro.met  && state.npcs.hiro.stage  >= 5,
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
      timeCost: cfg.timeCost ?? 1,
      energyCost: cfg.energyCost ?? 0,
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
    state.time.phase,
    state.time.remaining,
    state.resources.wisdom,
    state.resources.contacts,
    state.resources.energy.current,
    state.location,
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

function reqStage(npcId, n, stageLabelOverride) {
  const npc = state.npcs[npcId];
  const def = NPC_DEFS[npcId];
  const met = npc.met && npc.stage >= n;
  const stageName     = def.stages[npc.stage] ?? `Stage ${npc.stage}`;
  const requiredLabel = stageLabelOverride || (def.stages[n] ?? `Stage ${n}`);
  return {
    label: `${def.name} reached ${requiredLabel}`,
    met,
    detail: npc.met
      ? (met ? 'Done' : `Now: ${stageName} (need ${requiredLabel})`)
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
  visit_kenji:    () => [reqMet('kenji')],
  visit_yuki:     () => [reqMet('yuki')],
  visit_hiro:     () => [reqMet('hiro')],
  evening_kenji:  () => [reqMet('kenji'), reqFriendStage('kenji')],
  questions_yuki: () => [reqMet('yuki'), reqFriendStage('yuki')],
  pray_hiro:      () => [reqMet('hiro'), reqFriendStage('hiro')],
  disciple_kenji: () => [reqMet('kenji'), reqStage('kenji', 5, 'Believer')],
  disciple_yuki:  () => [reqMet('yuki'),  reqStage('yuki',  5, 'Believer')],
  disciple_hiro:  () => [reqMet('hiro'),  reqStage('hiro',  5, 'Believer')],
};

// All visible activity IDs, in stable order.
// Filtered by current location — actions whose `location` differs from `state.location`
// are hidden. Actions with no `location` (null) are always shown (location-agnostic, like global help).
export function allVisibleActions() {
  const here = state.location;
  return Object.entries(ACTION_DEFS)
    .filter(([, def]) => def.visible())
    .filter(([, def]) => def.location == null || def.location === here)
    .map(([id]) => id);
}

// Communication actions that benefit from language level
const COMM_ACTIONS    = new Set(['hand_tracts', 'commuter_convo', 'casual_convo', 'host_english']);
const SPIRIT_ACTIONS  = new Set(['pray', 'study_scripture', 'observe_shrine']);
const NPC_VISIT_ACTIONS = new Set([
  'visit_kenji', 'visit_yuki', 'visit_hiro',
  'evening_kenji', 'questions_yuki', 'pray_hiro',
  'disciple_kenji', 'disciple_yuki', 'disciple_hiro',
]);
// Deep-conversation actions (affect stress/burden scaling differently from quick visits).
// Disciple actions count as deep — the relationship intensity is the same or higher.
const NPC_DEEP_ACTIONS = new Set([
  'evening_kenji', 'questions_yuki', 'pray_hiro',
  'disciple_kenji', 'disciple_yuki', 'disciple_hiro',
]);

// Maps any NPC action ID → npcId (used by UI to show portrait in story popups).
export const NPC_ACTION_MAP = {
  visit_kenji:    'kenji', evening_kenji:   'kenji', disciple_kenji: 'kenji',
  visit_yuki:     'yuki',  questions_yuki:  'yuki',  disciple_yuki:  'yuki',
  visit_hiro:     'hiro',  pray_hiro:       'hiro',  disciple_hiro:  'hiro',
};

// Instant action. Returns { ok, id, bonuses, timeSpent, energySpent, reason }.
// ok=false reasons: 'locked' | 'time' | 'energy' | 'cost' | 'unknown'
export function doAction(actionId) {
  const def = ACTION_DEFS[actionId];
  if (!def) return { ok: false, reason: 'unknown' };
  if (!def.unlocked()) return { ok: false, reason: 'locked' };

  // Time first (cheapest check)
  if (!spendTime(def.timeCost)) return { ok: false, reason: 'time' };

  // Energy
  if (!spendEnergy(def.energyCost)) {
    gainTime(def.timeCost);
    return { ok: false, reason: 'energy' };
  }

  // Other costs (faith, money, wisdom)
  if (!spendCosts(def.cost)) {
    gainTime(def.timeCost);
    gainEnergy(def.energyCost);
    return { ok: false, reason: 'cost' };
  }

  // Select story beat BEFORE applying rewards — the beat may specify its own rewards.
  // This is the outcome-based reward system: some beats give more faith, some give none.
  const beat = getStoryBeat(actionId, state);

  // If the beat has a `rewards` field, use it for non-trust rewards (faith, wisdom, contacts, langXP).
  // NPC trust (npcTrust) always comes from the action def — beats don't override relationship progress.
  let effectiveReward;
  if (beat && beat.rewards !== undefined) {
    effectiveReward = { ...beat.rewards, npcTrust: def.reward.npcTrust };
  } else {
    effectiveReward = def.reward;
  }

  // Snapshot NPC inner state BEFORE rewards + penalty mutate it, so we can show
  // the player what their visit actually did to mood/stress/burden.
  const npcShiftId = NPC_ACTION_MAP[actionId];
  const npcBefore = npcShiftId ? snapshotNpcInner(npcShiftId) : null;

  const bonuses = applyRewards(actionId, effectiveReward);

  // Energy reward — beat.rewards.energyReward overrides the action def when present.
  const beatHasEnergyOverride = beat?.rewards && typeof beat.rewards.energyReward === 'number';
  const energyReward = beatHasEnergyOverride ? beat.rewards.energyReward : def.energyReward;
  if (energyReward) gainEnergy(energyReward);

  // Apply any penalty declared on the beat. Mutates state; returns deltas for the popup.
  const setback = applyPenalty(beat?.penalty);

  // Compute the npc inner-state delta. Includes effects from applyRewards AND any penalty.
  const npcShift = npcShiftId ? diffNpcInner(npcShiftId, npcBefore) : null;

  // Phase C: record this beat's ID so future beats can reference it with prevBeatId_<actionId>.
  // Only beats with an explicit `id` participate — anonymous beats don't get written.
  if (beat?.id) {
    state.flags.lastBeatByAction = state.flags.lastBeatByAction || {};
    state.flags.lastBeatByAction[actionId] = beat.id;
  }

  // Phase C: per-NPC flag system. setsFlag/clearsFlag live on the beat and target the
  // action's own NPC (implicit). Cross-NPC reads happen via flagSet_<npcId> in conditions.
  // Flags store the day they were set (number) — supports future "stale flag" rules.
  if (npcShiftId && state.npcs[npcShiftId]) {
    const npcFlags = state.npcs[npcShiftId].flags = state.npcs[npcShiftId].flags || {};
    if (typeof beat?.setsFlag === 'string') {
      npcFlags[beat.setsFlag] = state.time.day;
    }
    if (typeof beat?.clearsFlag === 'string') {
      delete npcFlags[beat.clearsFlag];
    }
  }

  // Phase C: track day-level events for the reflection picker.
  if (setback) state.dayLog.setbackToday = true;

  // SpiritDry recovery from spiritual/rest actions — always fires on success.
  // These are the missionary's defenses against burnout: prayer, sleep, the onsen.
  if (actionId === 'pray')              adjustSpiritDry(-1);
  else if (actionId === 'rest')         adjustSpiritDry(-1);
  else if (actionId === 'onsen_visit')  adjustSpiritDry(-2);

  if (def.onComplete) def.onComplete();

  state.stats.actionsCompleted++;
  state.time.actionsThisPhase++;

  // Note: state.location is NOT updated here. Location only changes via travelTo().
  // Actions are filtered by the player's current location (see allVisibleActions).

  if (def.npcChance) {
    const { id: npcId, chance } = def.npcChance;
    if (!state.npcs[npcId].met && Math.random() < chance) {
      state.npcs[npcId].met = true;
      state.flags.pendingNPCMeet = npcId;
    }
  }

  const visitNpcId = NPC_ACTION_MAP[actionId];
  if (visitNpcId && state.npcs[visitNpcId]) {
    state.npcs[visitNpcId].lastSeenDay = state.time.day;
  }

  const phase = state.time.phase;
  if (state.dayLog?.phases?.[phase]) {
    state.dayLog.phases[phase].push({ id: actionId, location: def.location });
  }

  // Build a display-friendly reward object for the story popup.
  // Includes the effective reward plus the actual energyReward applied (if any).
  const displayReward = { ...effectiveReward };
  if (energyReward) displayReward.energyReward = energyReward;

  return {
    ok: true,
    id: actionId,
    bonuses,
    beat,
    reward: displayReward,
    setback,                      // null if beat had no penalty
    npcShift,                     // null when not an NPC action; else { npcId, mood, stress, burden } deltas (only non-zero fields)
    timeSpent: def.timeCost,
    energySpent: def.energyCost,
  };
}

// Snapshot of an NPC's mutable inner state for diffing post-action.
function snapshotNpcInner(npcId) {
  const npc = state.npcs[npcId];
  if (!npc) return null;
  return { mood: npc.mood ?? 0, stress: npc.stress ?? 0, burden: npc.burden ?? 0 };
}

// Returns a shift object { npcId, mood, stress, burden } with only non-zero deltas.
// null if nothing actually changed (so the UI can skip rendering an empty row).
function diffNpcInner(npcId, before) {
  if (!before) return null;
  const after = snapshotNpcInner(npcId);
  if (!after) return null;
  const out = { npcId };
  let any = false;
  for (const key of ['mood', 'stress', 'burden']) {
    const delta = after[key] - before[key];
    if (delta !== 0) { out[key] = delta; any = true; }
  }
  return any ? out : null;
}

// Does the player have at least one available action OR a travel option that fits remaining time + energy?
// Used by UI to nudge End Phase when nothing else can be done. With travel as a real option,
// you almost always have *something* you could do (travel home costs 1 time), so this only returns
// false when time is literally exhausted.
export function hasFittingAction() {
  const t = state.time.remaining;
  const e = state.resources.energy.current;
  const here = state.location;

  // Any travel destination affordable? (cheapest = 1 time)
  if (t >= 1) {
    // If we have at least 1 time and there's any location other than current, travel is possible.
    // (The actual destinations have varied costs but the minimum is 1.)
    return true;
  }

  return Object.values(ACTION_DEFS).some(def => {
    if (!def.visible()) return false;
    if (!def.unlocked()) return false;
    if (def.location != null && def.location !== here) return false;
    if (def.timeCost > t) return false;
    if (def.energyCost > e) return false;
    if (def.cost?.faith  && state.resources.faith.current  < def.cost.faith)  return false;
    if (def.cost?.money  && state.resources.money.current  < def.cost.money)  return false;
    if (def.cost?.wisdom && state.resources.wisdom         < def.cost.wisdom) return false;
    return true;
  });
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

  // Numeric checks (not truthy) so negative values flow through.
  if (typeof reward.faith    === 'number') gain('faith',    reward.faith);
  if (typeof reward.contacts === 'number') gain('contacts', reward.contacts);
  if (typeof reward.money    === 'number') gain('money',    reward.money);
  if (typeof reward.wisdom   === 'number') gain('wisdom',   reward.wisdom);
  if (typeof reward.langXP   === 'number' && reward.langXP > 0) addLangXP(reward.langXP);
  if (reward.npcTrust) addNPCTrust(reward.npcTrust.id, reward.npcTrust.amount);

  const bonuses = {};
  const lang    = state.language.level;
  const wisdom  = state.resources.wisdom;

  // Multiplier bonuses only apply to *positive* base rewards — never amplify a loss.
  if (COMM_ACTIONS.has(id) && reward.contacts > 0 && lang > 0) {
    const bonus = Math.floor(lang * 0.25 * reward.contacts);
    if (bonus > 0) { gain('contacts', bonus); bonuses.contacts = bonus; }
  }

  if (SPIRIT_ACTIONS.has(id) && reward.faith > 0 && wisdom > 0) {
    const bonus = Math.floor((wisdom / 100) * reward.faith);
    if (bonus > 0) { gain('faith', bonus); bonuses.faith = bonus; }
  }

  if (NPC_VISIT_ACTIONS.has(id) && reward.npcTrust) {
    const LANG_SCALE = [0.4, 0.7, 1.0, 1.0, 1.0, 1.0];
    const npcId  = reward.npcTrust.id;
    const npc    = state.npcs[npcId];
    const npcDef = NPC_DEFS[npcId];
    const lw = npcDef?.langWeight ?? 1.0;
    const scale = LANG_SCALE[Math.min(lang, 5)];
    const langFactor = 1 - (lw * (1 - scale));
    const baseTrust = reward.npcTrust.amount;

    // Lang delta (existing)
    const langDelta = Math.round((langFactor - 1) * baseTrust);
    if (langDelta !== 0) addNPCTrust(npcId, langDelta);

    // Lang 3+ bonus (existing)
    if (lang >= 3) {
      const bonus = Math.floor((lang - 2) * 0.2 * baseTrust);
      if (bonus > 0) { addNPCTrust(npcId, bonus); bonuses.npcTrust = bonus; }
    }

    // Step 2: stress/burden/mood affect trust + update NPC emotional state
    if (npc) {
      const actionType = NPC_DEEP_ACTIONS.has(id) ? 'deep' : 'visit';
      const stress = npc.stress ?? 0;
      const burden = npc.burden ?? 0;
      const mood   = npc.mood   ?? 0;

      // Stress reduces trust from all visits (stressFactor: stress 0 → ×1.0, stress 10 → ×0.6)
      const stressDelta = Math.round((1 - stress * 0.04 - 1) * baseTrust);
      if (stressDelta !== 0) addNPCTrust(npcId, stressDelta);

      // Burden boosts trust from DEEP visits only (burdenFactor: burden 0 → ×1.0, burden 10 → ×1.5)
      if (actionType === 'deep') {
        const burdenBonus = Math.round(burden * 0.05 * baseTrust);
        if (burdenBonus > 0) addNPCTrust(npcId, burdenBonus);
      }

      // High mood gives a small extra trust bonus (warmth in the relationship)
      if (mood > 3) {
        const moodBonus = Math.round(baseTrust * 0.15);
        if (moodBonus > 0) addNPCTrust(npcId, moodBonus);
      }

      // Hiro special: showing up when he's most withdrawn matters most
      if (npcId === 'hiro' && mood < -3) {
        const presenceBonus = Math.round(baseTrust * 0.20);
        if (presenceBonus > 0) addNPCTrust(npcId, presenceBonus);
      }

      // Apply mood/stress/burden changes from the visit itself
      const moodDelta = calcVisitMoodDelta(npcId, actionType);
      adjustNPC(npcId, {
        mood:   moodDelta,
        stress: actionType === 'deep' ? -3 : -2,
        burden: actionType === 'deep' ? -2 : -1,
      });
    }
  }

  return bonuses;
}

// Apply a beat's `penalty` block. Mutates state and returns the actual deltas applied
// so the UI can show them as red "down" chips in the setback popup.
//
// Stat magnitudes (faith / wisdom / contacts) are written as POSITIVE numbers in JSON
// (the magnitude lost). NPC mood/stress/burden are signed deltas — author writes them
// as they should change. trust loss is a positive magnitude.
function applyPenalty(penalty) {
  if (!penalty) return null;
  const deltas = {};

  if (typeof penalty.faith    === 'number' && penalty.faith    > 0) { lose('faith',    penalty.faith);    deltas.faith    = penalty.faith; }
  if (typeof penalty.wisdom   === 'number' && penalty.wisdom   > 0) { lose('wisdom',   penalty.wisdom);   deltas.wisdom   = penalty.wisdom; }
  if (typeof penalty.contacts === 'number' && penalty.contacts > 0) { lose('contacts', penalty.contacts); deltas.contacts = penalty.contacts; }

  if (typeof penalty.spiritDry === 'number' && penalty.spiritDry !== 0) {
    adjustSpiritDry(penalty.spiritDry);
    deltas.spiritDry = penalty.spiritDry;
  }

  if (penalty.trust && typeof penalty.trust.amount === 'number' && penalty.trust.amount > 0) {
    addNPCTrust(penalty.trust.id, -Math.abs(penalty.trust.amount));
    deltas.trust = { id: penalty.trust.id, amount: penalty.trust.amount };
  }

  if (penalty.npcMood)   { adjustNPC(penalty.npcMood.id,   { mood:   penalty.npcMood.amount });   deltas.npcMood   = penalty.npcMood; }
  if (penalty.npcStress) { adjustNPC(penalty.npcStress.id, { stress: penalty.npcStress.amount }); deltas.npcStress = penalty.npcStress; }
  if (penalty.npcBurden) { adjustNPC(penalty.npcBurden.id, { burden: penalty.npcBurden.amount }); deltas.npcBurden = penalty.npcBurden; }

  return Object.keys(deltas).length > 0 ? deltas : null;
}
