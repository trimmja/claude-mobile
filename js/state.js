export const state = {
  meta: { version: 1, saveDate: null },
  character: { name: '' },
  time: { day: 1, secondsPlayed: 0 },
  resources: {
    faith:    { current: 50, max: 100 },
    contacts: 0,
    money:    { current: 300, nextPayday: 30 },
    wisdom:   0,
  },
  language: { xp: 0, level: 0 },
  location: 'apartment',
  action: { id: null, startTime: null, duration: 0, label: '' },
  npcs: {
    kenji: { met: false, trust: 0, stage: 0 },
    yuki:  { met: false, trust: 0, stage: 0 },
    hiro:  { met: false, trust: 0, stage: 0 },
  },
  milestones: { completed: [] },
  stats: {
    converts: 0,
    actionsCompleted: 0,
    onsenVisited: false,
  },
  flags: {
    muted: false,
    pendingNPCMeet: null,
    pendingMilestone: null,
  },
};
