// "What should I do next?" — the recommendation rule behind the ★ card.
//
// Plain version: who's closest to a breakthrough that you haven't seen in a while?
//
//   1. Among met, not-yet-Elder NPCs whose ONLY blocker to the next stage is trust
//      (getStageAdvanceHint returns "N trust to next stage", not a condition gate),
//      pick the one closest to advancing — tie-broken by longest since last seen.
//   2. Recommend that NPC's visit action, at their location.
//   3. Fallbacks when no NPC qualifies: low energy → rest; otherwise study/pray.
//
// Returns { actionId, location, npcId? } or null. The UI lights the ★ only when the
// player is AT recommendation.location (so it nudges travel without nagging).

import { state } from './state.js';
import { NPC_DEFS, getStageAdvanceHint } from './npcs.js';
import { ACTION_DEFS } from './actions.js';

const NPC_VISIT_ACTION = { kenji: 'visit_kenji', yuki: 'visit_yuki', hiro: 'visit_hiro' };

export function getRecommendation() {
  // 1. NPC closest to a trust-only breakthrough.
  const candidates = [];
  for (const id of Object.keys(NPC_DEFS)) {
    const npc = state.npcs[id];
    if (!npc?.met || npc.stage >= 8) continue;
    const hint = getStageAdvanceHint(id);
    if (!hint) continue;
    const m = /^(\d+) trust to next stage$/.exec(hint);
    if (!m) continue; // blocked by a condition gate (wisdom/language/etc.), not just trust
    const gap = parseInt(m[1], 10);
    const lastSeen = npc.lastSeenDay == null ? Infinity : state.time.day - npc.lastSeenDay;
    candidates.push({ id, gap, lastSeen });
  }
  if (candidates.length) {
    candidates.sort((a, b) => a.gap - b.gap || b.lastSeen - a.lastSeen);
    const best = candidates[0];
    const actionId = NPC_VISIT_ACTION[best.id];
    const def = ACTION_DEFS[actionId];
    return { actionId, location: def?.location ?? state.location, npcId: best.id };
  }

  // 2. Fallbacks — keep yourself spiritually and physically fed.
  if (state.resources.energy.current <= 4 && ACTION_DEFS.rest) {
    return { actionId: 'rest', location: 'apartment' };
  }
  if (ACTION_DEFS.study_scripture) {
    return { actionId: 'study_scripture', location: 'apartment' };
  }
  // pray has no fixed location — point at wherever you are so the ★ always lights.
  return { actionId: 'pray', location: state.location };
}
