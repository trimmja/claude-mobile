import { state } from './state.js';

export const NPC_DEFS = {
  kenji: {
    name: 'Kenji',
    nameJP: '健二',
    role: 'Salaryman, 34',
    emoji: '👔',
    line: 'Corporate stress surfaces. He says things he’d never say at work.',
    portraitClass: 'portrait-kenji',
    cardClass: 'npc-kenji',
    // langWeight: how much language level affects trust gain (1.0 = fully verbal)
    langWeight: 1.0,
    // Language-gated first-meet text. Index = minimum language level required.
    // Higher levels use the last entry in the array.
    introByLang: [
      // Level 0 — barely any Japanese
      `A suited man nearly knocks your tracts to the ground. He stops, bows quickly. He picks one up and reads the title aloud: "クリスチャン..." He looks at you, starts to say something, then thinks better of it. Instead he reaches into his jacket and places a business card in your hand — printed both sides, Kitamura Kenji — and bows before hurrying off. You don't know what to make of it. But you have his number.`,
      // Level 1 — can follow the basics
      `A man in a suit rushes past and nearly knocks your tracts away. He pauses, bows. "Ah... Christian?" he says carefully. "I have... question. Maybe later." He reaches into his jacket and hands you his business card — Kitamura Kenji — before merging back into the crowd. Something in the way he held the tract stays with you.`,
      // Level 2+ — full exchange
      `A man in a suit rushes past and nearly knocks your tracts out of your hand. He pauses, bows quickly, and reads the title. "Ah... Christian?" he says in careful English. His name is Kenji — Kitamura Kenji. He's polite, guarded. Before he leaves he hands you his business card. "Maybe we can... talk. Sometime." He doesn't look back.`,
    ],
    stages: [
      'Stranger',
      'Acquaintance',
      'Friend',
      'Open to faith',
      'Studying scripture',
      'Believer',
      'Disciple',
      'Servant',
      'Elder',
    ],
    trustNeeded: [0, 10, 28, 55, 85, 100, 115, 135, 160],
    stageCondition: [
      () => true,
      () => true,
      () => true,
      () => state.resources.wisdom >= 15,
      () => state.language.level >= 2,
      () => state.language.level >= 3,
      () => true,                                                       // Stage 6 (Disciple) — open after conversion
      () => state.resources.wisdom >= 30,                               // Stage 7 (Servant — Kenji wants to understand before serving)
      () => (state.npcs.kenji.roleProgress?.servicesAttended ?? 0) >= 3, // Stage 8 (Elder — organizational gifting)
    ],
    // Human-readable hint for the extra condition on each stage advance.
    // null means trust alone is sufficient.
    stageConditionHints: [null, null, null, 'Wisdom 15', 'Language Level 2', 'Language Level 3', null, 'Wisdom 30', 'Attend 3 Sunday services'],
  },

  yuki: {
    name: 'Yuki',
    nameJP: '由紀',
    role: 'University student, 21',
    emoji: '📚',
    line: 'She came back with a list of written questions. Theology as a puzzle.',
    portraitClass: 'portrait-yuki',
    cardClass: 'npc-yuki',
    // langWeight: how much language level affects trust gain (1.0 = fully verbal)
    langWeight: 1.0,
    introByLang: [
      // Level 0
      `A young woman stays after your English event while you stack chairs. She says something in Japanese — you catch the word 違う, "different." She smiles when you look confused and switches to English: "Your English... kind." She opens her phone, types something, and holds it out — a LINE QR code. Her name is Yuki. She seems like she has a lot more to say.`,
      // Level 1
      `A young woman stays after the English event. "Your English feels... more human than textbooks," she says. "I have many questions." She's smiling but serious. Before you finish cleaning up she pulls out her phone: "Can I... LINE you?" Her name is Yuki. You believe her about the questions.`,
      // Level 2+
      `A young woman at your English event stays after everyone else leaves. "Your English — it's different," she says, smiling. "More kind." Her name is Yuki. She's studying linguistics. Before she goes she adds you on LINE. "I have questions," she says. "Many." She clearly means it.`,
    ],
    stages: [
      'Stranger',
      'Acquaintance',
      'Friend',
      'Open to faith',
      'Studying scripture',
      'Believer',
      'Disciple',
      'Servant',
      'Elder',
    ],
    trustNeeded: [0, 10, 28, 55, 85, 100, 115, 135, 160],
    stageCondition: [
      () => true,
      () => true,
      () => true,
      () => state.resources.wisdom >= 15,
      () => state.language.level >= 2,
      () => state.language.level >= 3,
      () => true,                                                       // Stage 6 (Disciple)
      () => state.language.level >= 4,                                  // Stage 7 (Servant — teaching gift surfaces with deeper language)
      () => (state.npcs.yuki.roleProgress?.studiesCoTaught ?? 0) >= 2,  // Stage 8 (Elder — teaching gifting)
    ],
    stageConditionHints: [null, null, null, 'Wisdom 15', 'Language Level 2', 'Language Level 3', null, 'Language Level 4', 'Co-teach 2 Bible studies'],
  },

  hiro: {
    name: 'Hiro',
    nameJP: '浩',
    role: 'Retired, 68',
    emoji: '🌿',
    line: 'He told you Emiko’s name. He told you she prayed.',
    portraitClass: 'portrait-hiro',
    cardClass: 'npc-hiro',
    // langWeight: low — presence and silence are this relationship
    langWeight: 0.3,
    introByLang: [
      // Level 0 — very little understood
      `An old man sits on a park bench feeding pigeons. He watches you with tired eyes. When you sit beside him, he doesn't leave. After a long silence he says something slowly — too slowly to be for you, more like he's talking to himself. You catch 奥さん — wife. And 毎日 — every day. He looks at you when you don't leave. His name is Hiro. He's here every morning.`,
      // Level 1
      `An old man on a bench. He watches you preach, then keeps sitting when you finish. "You... preacher?" he asks carefully. "My wife... she believed." He says her name once, quietly, then says nothing more. His name is Hiro. He comes here every day — same bench, same direction, same time.`,
      // Level 2+
      `An old man sits on a park bench feeding pigeons. He watches you preach with tired eyes. When you sit beside him, he doesn't leave. After a long silence he says, in slow Japanese, something about his wife. She died last year. He comes here every morning. His name is Hiro. You can find him here anytime.`,
    ],
    stages: [
      'Stranger',
      'Acquaintance',
      'Friend',
      'Open to faith',
      'Studying scripture',
      'Believer',
      'Disciple',
      'Servant',
      'Elder',
    ],
    trustNeeded: [0, 10, 28, 55, 85, 100, 115, 135, 160],
    stageCondition: [
      () => true,
      () => true,
      () => true,
      () => state.resources.wisdom >= 15,
      () => state.language.level >= 1,
      () => state.language.level >= 3,
      () => true,                                                         // Stage 6 (Disciple)
      () => state.stats.daysSurvived >= 60,                               // Stage 7 (Servant — pastoral gift is slow grief-tempered patience)
      () => (state.npcs.hiro.roleProgress?.othersShepherded ?? 0) >= 3,   // Stage 8 (Elder — pastoral gifting)
    ],
    stageConditionHints: [null, null, null, 'Wisdom 15', 'Language Level 1', 'Language Level 3', null, '60 days survived', 'Shepherd 3 other believers'],
  },
};

// Pick the correct intro text based on current language level.
export function getIntroText(npcId) {
  const def = NPC_DEFS[npcId];
  const lv = state.language.level;
  const byLang = def.introByLang;
  return byLang[Math.min(lv, byLang.length - 1)];
}

export function getStageName(npcId) {
  const npc = state.npcs[npcId];
  return NPC_DEFS[npcId].stages[npc.stage];
}

export function getTrustPercent(npcId) {
  const npc = state.npcs[npcId];
  const def = NPC_DEFS[npcId];
  const curr = def.trustNeeded[npc.stage] || 0;
  const next  = def.trustNeeded[npc.stage + 1];
  if (!next) return 100;
  return Math.min(100, ((npc.trust - curr) / (next - curr)) * 100);
}

// Returns a short human-readable hint about what is blocking the next stage advance.
// Returns null if at max stage or if the advance should happen automatically.
export function getStageAdvanceHint(npcId) {
  const npc = state.npcs[npcId];
  const def = NPC_DEFS[npcId];
  if (npc.stage >= 8) return null;

  const nextStage = npc.stage + 1;
  const trustNeeded = def.trustNeeded[nextStage];
  const condHint = def.stageConditionHints[nextStage];
  const condMet = def.stageCondition[nextStage]();
  const trustMet = npc.trust >= trustNeeded;
  const trustLeft = trustNeeded - Math.floor(npc.trust);

  if (!trustMet) {
    return trustLeft + ' trust to next stage';
  }
  if (!condMet && condHint) {
    return 'Needs: ' + condHint;
  }
  return null;
}

// Adjust an NPC's trust. Accepts negative amounts (a cool-off after a bad visit).
// Trust never regresses past the floor of the current stage — they don't *forget*
// you, just lose warmth. No stage-down events fire.
export function addNPCTrust(npcId, amount) {
  const npc = state.npcs[npcId];
  const def = NPC_DEFS[npcId];
  const stageFloor = def.trustNeeded[npc.stage] ?? 0;
  // Trust ceiling lifted to 200 to accommodate discipleship stages 6–8 (trustNeeded reaches 160).
  npc.trust = Math.max(stageFloor, Math.min(200, npc.trust + amount));
  // check stage advance (only on positive deltas naturally — negative can't push you up)
  if (npc.stage < 8) {
    const needed = def.trustNeeded[npc.stage + 1];
    const cond   = def.stageCondition[npc.stage + 1];
    if (npc.trust >= needed && cond()) {
      npc.stage++;
      if (npc.stage === 5) state.stats.converts++;
      // queue a stage-advance moment for the engine to fire after the action settles
      state.flags.pendingStageAdvances.push({ npcId, newStage: npc.stage });
      return true;
    }
  }
  return false;
}

// ─── Stage-advance moments ──────────────────────────────────────────────────
// Text shown when an NPC reaches a new stage. Loaded from data/stageAdvances.json.
let STAGE_ADVANCE_TEXT = {};

export function initStageAdvancesFromData(data) {
  STAGE_ADVANCE_TEXT = {};
  for (const [npcId, byStage] of Object.entries(data || {})) {
    if (npcId.startsWith('_')) continue;
    STAGE_ADVANCE_TEXT[npcId] = byStage;
  }
}

export function getStageAdvanceText(npcId, stage) {
  return STAGE_ADVANCE_TEXT[npcId]?.[String(stage)] || null;
}

export function metNPCCount() {
  return Object.values(state.npcs).filter(n => n.met).length;
}

export function believerCount() {
  // Stages 5+ are all believers (Believer → Disciple → Servant → Elder).
  return Object.values(state.npcs).filter(n => n.stage >= 5).length;
}

export function elderCount() {
  return Object.values(state.npcs).filter(n => n.stage >= 8).length;
}

// ─── NPC mood / stress / burden system ────────────────────────────────────────

// NPC events data loaded from data/npcEvents.json
let NPC_EVENTS = {};

export function initNPCEventsFromData(data) {
  NPC_EVENTS = data || {};
}

export function getNPCEvents(npcId) {
  return NPC_EVENTS[npcId] || { scripted: [], random: [] };
}

/**
 * Clamp a value to [min, max].
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Apply deltas to an NPC's mood, stress, and burden.
 * All writes go through here so clamping is always applied.
 * Passing undefined for a field leaves it unchanged.
 */
export function adjustNPC(npcId, { mood, stress, burden }) {
  const npc = state.npcs[npcId];
  if (!npc) return;
  if (mood    !== undefined) npc.mood    = clamp((npc.mood    ?? 0) + mood,    -5, 5);
  if (stress  !== undefined) npc.stress  = clamp((npc.stress  ?? 0) + stress,   0, 10);
  if (burden  !== undefined) npc.burden  = clamp((npc.burden  ?? 0) + burden,   0, 10);
}

/**
 * Compute the mood delta from a visit, based on NPC's current stress and player's language level.
 * Deep visits start more positive but are hurt more by high stress.
 * Returns a value in [-2, +4].
 */
export function calcVisitMoodDelta(npcId, actionType) {
  const npc  = state.npcs[npcId];
  const lang = state.language.level;
  if (!npc) return 0;

  let delta = actionType === 'deep' ? 2 : 1;

  // High stress makes the interaction harder — they're too distracted
  if (npc.stress >= 6) delta -= 2;
  else if (npc.stress >= 4) delta -= 1;

  // Language helps break through stress
  if (lang >= 2) delta += 1;
  else if (lang === 0 && npc.stress >= 4) delta -= 1; // no words + distracted = painful

  return clamp(delta, -2, 4);
}

/**
 * Migration helper: initialize mood/stress/burden/firedEvents on an NPC entry
 * if the fields are missing (saves made before Step 2).
 * Starting values match the defaults in state.js.
 */
export function initNPCMoodStats(npcId) {
  const npc = state.npcs[npcId];
  if (!npc) return;
  const defaults = { kenji: { stress: 3, burden: 5 }, yuki: { stress: 2, burden: 3 }, hiro: { stress: 1, burden: 7 } };
  const d = defaults[npcId] || { stress: 2, burden: 3 };
  if (typeof npc.mood    !== 'number') npc.mood    = 0;
  if (typeof npc.stress  !== 'number') npc.stress  = d.stress;
  if (typeof npc.burden  !== 'number') npc.burden  = d.burden;
  if (!Array.isArray(npc.firedEvents)) npc.firedEvents = [];
}

/**
 * Migration helper: initialize roleProgress on an NPC entry if missing (saves before D1).
 * roleProgress fields are the gates for Stage 8 (Elder) — counters incremented by D3 events.
 */
export function initNPCRoleProgress(npcId) {
  const npc = state.npcs[npcId];
  if (!npc) return;
  if (!npc.roleProgress || typeof npc.roleProgress !== 'object') npc.roleProgress = {};
  if (typeof npc.roleProgress.servicesAttended !== 'number') npc.roleProgress.servicesAttended = 0;
  if (typeof npc.roleProgress.studiesCoTaught  !== 'number') npc.roleProgress.studiesCoTaught  = 0;
  if (typeof npc.roleProgress.othersShepherded !== 'number') npc.roleProgress.othersShepherded = 0;
}
