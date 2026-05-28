export const state = {
  meta: { version: 2, saveDate: null },
  // spiritDry (0–10): missionary's own spiritual dryness. Ticks up from hard outcomes
  // and zero-contact days; comes down with pray/rest/onsen. At ≥6 the story-beat picker
  // biases preaching/tract actions toward hostile/hollow outcomes — the words feel hollow.
  character: { name: '', spiritDry: 0 },

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
    // mood: -5 to +5 (warmth in the relationship right now; changes from events + visit quality)
    // stress: 0–10 (busyness/overwhelm — HIGH blocks visits, reduces trust)
    // burden: 0–10 (deep weariness/need — HIGH opens gospel, boosts deep-visit trust)
    // firedEvents: IDs of scripted life events that have already fired (dedup)
    // flags: { name: dayItWasSet } — short-lived per-NPC carryover (e.g. "left_early": 12).
    //   Beats set with setsFlag_<npcId>: "name" and require flagSet_<npcId>: "name".
    //   Beats can clear consumed flags with clearsFlag_<npcId>: "name".
    kenji: { met: false, trust: 0, stage: 0, lastSeenDay: null, mood: 0, stress: 3, burden: 5, firedEvents: [], flags: {} },
    yuki:  { met: false, trust: 0, stage: 0, lastSeenDay: null, mood: 0, stress: 2, burden: 3, firedEvents: [], flags: {} },
    hiro:  { met: false, trust: 0, stage: 0, lastSeenDay: null, mood: 0, stress: 1, burden: 7, firedEvents: [], flags: {} },
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
    // Most recent beat ID per action. Written by doAction after a beat with an `id` field
    // fires. Enables story conditions like `prevBeatId_pray: "dry_silence"`.
    // Bounded: one entry per action ID, overwritten each time that action runs.
    lastBeatByAction: {},
  },

  dayLog: {
    phases: { morning: [], afternoon: [], evening: [] },
    startContacts: 0,           // contacts at start of day — used to compute contactsToday for reflections
    paydayToday: false,         // set true when payday fires during this day
    setbackToday: false,        // set true when any beat with a `penalty` fired today
    langLevelUpToday: false,    // set true when language level rose during this day
  },
};
