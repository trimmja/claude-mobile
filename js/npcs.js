import { state } from './state.js';

export const NPC_DEFS = {
  kenji: {
    name: 'Kenji',
    nameJP: '健二',
    role: 'Salaryman, 34',
    emoji: '👔',
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
    ],
    trustNeeded: [0, 10, 28, 55, 85, 100],
    stageCondition: [
      () => true,
      () => true,
      () => true,
      () => state.resources.wisdom >= 15,
      () => state.language.level >= 2,
      () => state.language.level >= 3,
    ],
    // Human-readable hint for the extra condition on each stage advance.
    // null means trust alone is sufficient.
    stageConditionHints: [null, null, null, 'Wisdom 15', 'Language Level 2', 'Language Level 3'],
  },

  yuki: {
    name: 'Yuki',
    nameJP: '由紀',
    role: 'University student, 21',
    emoji: '📚',
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
    ],
    trustNeeded: [0, 10, 28, 55, 85, 100],
    stageCondition: [
      () => true,
      () => true,
      () => true,
      () => state.resources.wisdom >= 15,
      () => state.language.level >= 2,
      () => state.language.level >= 3,
    ],
    stageConditionHints: [null, null, null, 'Wisdom 15', 'Language Level 2', 'Language Level 3'],
  },

  hiro: {
    name: 'Hiro',
    nameJP: '浩',
    role: 'Retired, 68',
    emoji: '🌿',
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
    ],
    trustNeeded: [0, 10, 28, 55, 85, 100],
    stageCondition: [
      () => true,
      () => true,
      () => true,
      () => state.resources.wisdom >= 15,
      () => state.language.level >= 1,
      () => state.language.level >= 3,
    ],
    stageConditionHints: [null, null, null, 'Wisdom 15', 'Language Level 1', 'Language Level 3'],
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
  if (npc.stage >= 5) return null;

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

export function addNPCTrust(npcId, amount) {
  const npc = state.npcs[npcId];
  const def = NPC_DEFS[npcId];
  npc.trust = Math.min(100, npc.trust + amount);
  // check stage advance
  if (npc.stage < 5) {
    const needed = def.trustNeeded[npc.stage + 1];
    const cond   = def.stageCondition[npc.stage + 1];
    if (npc.trust >= needed && cond()) {
      npc.stage++;
      if (npc.stage === 5) state.stats.converts++;
      return true; // stage advanced
    }
  }
  return false;
}

export function metNPCCount() {
  return Object.values(state.npcs).filter(n => n.met).length;
}

export function believerCount() {
  return Object.values(state.npcs).filter(n => n.stage === 5).length;
}
