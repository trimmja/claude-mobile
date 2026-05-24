export const state = {
  meta: { version: 2, saveDate: null },
  character: { name: '' },

  time: {
    day: 1,
    phase: 'morning',      // 'morning' | 'afternoon' | 'evening' | 'reflecting'
    actionsThisPhase: 0,
  },

  resources: {
    faith:    { current: 50, max: 100 },
    contacts: 0,
    money:    { current: 300, nextPayday: 6 },
    wisdom:   0,
    energy:   { current: 6, max: 6 },
  },

  language: { xp: 0, level: 0 },
  location: 'apartment',     // tracks last-action location for flavor

  npcs: {
    kenji: { met: false, trust: 0, stage: 0, lastSeenDay: null },
    yuki:  { met: false, trust: 0, stage: 0, lastSeenDay: null },
    hiro:  { met: false, trust: 0, stage: 0, lastSeenDay: null },
  },

  world: {},                  // placeholder for future weather/events

  milestones: { completed: [] },

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
  },

  dayLog: { phases: { morning: [], afternoon: [], evening: [] } },
};
