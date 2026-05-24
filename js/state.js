export const state = {
  meta: { version: 2, saveDate: null },
  character: { name: '' },

  time: {
    day: 1,
    phase: 'morning',         // 'morning' | 'afternoon' | 'evening' | 'reflecting'
    actionsThisPhase: 0,
    remaining: 6,             // time units left in current phase (per-phase resource)
    max: 6,                   // refilled from data/timing.json at boot
  },

  resources: {
    faith:    { current: 50, max: 100 },
    contacts: 0,
    money:    { current: 300, nextPayday: 6 },
    wisdom:   0,
    energy:   { current: 14, max: 14 },   // daily pool — refills only at morning of new day
  },

  language: { xp: 0, level: 0 },
  location: 'apartment',

  npcs: {
    kenji: { met: false, trust: 0, stage: 0, lastSeenDay: null },
    yuki:  { met: false, trust: 0, stage: 0, lastSeenDay: null },
    hiro:  { met: false, trust: 0, stage: 0, lastSeenDay: null },
  },

  world: {},

  milestones: { completed: [] },

  // Player-facing journal — append-only record of important moments.
  // Each entry: { id, day, phase, icon, title, body, type, npcId? }
  journal: [],

  stats: {
    converts: 0,
    actionsCompleted: 0,
    onsenVisited: false,
    daysSurvived: 0,
  },

  flags: {
    muted: false,
    pendingNPCMeet: null,
    pendingMilestone: null,
    pendingEndOfDay: false,
    pendingStageAdvances: [],   // [{ npcId, newStage }] — drained after action by engine
    pendingLangLevelUp: 0,      // 0 if none; otherwise the new level — drained by engine
    unreadJournalCount: 0,      // resets when player taps the Journal tab
    notifiedUnlocks: [],        // action IDs already announced as unlocked (dedupe)
  },

  dayLog: { phases: { morning: [], afternoon: [], evening: [] } },
};
