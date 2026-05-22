import { state } from './state.js';

export const NPC_DEFS = {
  kenji: {
    name: 'Kenji',
    nameJP: '健二',
    role: 'Salaryman, 34',
    emoji: '👔',
    portraitClass: 'portrait-kenji',
    cardClass: 'npc-kenji',
    intro: `A man in a suit rushes past and nearly knocks your tracts out of your hand. He pauses, bows quickly, and notices the pamphlet. "Ah... Christian?" he says carefully in English. His name is Kenji. He's polite, guarded — but he didn't walk away.`,
    stages: [
      'Stranger',
      'Acquaintance',
      'Friend',
      'Open to faith',
      'Studying scripture',
      'Believer',
    ],
    trustNeeded: [0, 10, 28, 55, 85, 100],
    // extra condition per stage (beyond trust)
    stageCondition: [
      () => true,
      () => true,
      () => true,
      () => state.resources.wisdom >= 15,
      () => state.language.level >= 2,
      () => state.language.level >= 3,
    ],
  },
  yuki: {
    name: 'Yuki',
    nameJP: '由紀',
    role: 'University student, 21',
    emoji: '📚',
    portraitClass: 'portrait-yuki',
    cardClass: 'npc-yuki',
    intro: `A young woman at your English event stays after everyone else leaves. "Your English... it's different," she says, smiling shyly. "More kind." Her name is Yuki. She's studying linguistics. She's genuinely curious about everything — including you.`,
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
  },
  hiro: {
    name: 'Hiro',
    nameJP: '浩',
    role: 'Retired, 68',
    emoji: '🌿',
    portraitClass: 'portrait-hiro',
    cardClass: 'npc-hiro',
    intro: `An old man sits on a park bench feeding pigeons. He watches you preach with tired eyes. When you sit beside him, he doesn't leave. After a long silence he says, in slow Japanese, something about his wife. She died last year. His name is Hiro. He comes to this park every day.`,
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
  },
};

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
