// Story text selection for action completion popups.
// Loaded from data/stories.json at boot.

let STORIES = {};

export function initStoriesFromData(data) {
  STORIES = data;
}

// Actions whose outcomes lean on the missionary's inner state — when spiritDry is high,
// the picker biases these toward penalty-bearing beats (hostile crowds, hollow words).
const DRY_BIAS_ACTIONS = new Set(['open_air_preach', 'hand_tracts', 'commuter_convo', 'pray', 'study_scripture']);

// Returns the full matching story beat object { text, rewards?, penalty? } for the given
// action, or null if no stories are defined.
// When a beat has `rewards`, those override the action's blanket reward in actions.js.
// When a beat has `penalty`, applyPenalty() in actions.js deducts those stats after rewards.
export function getStoryBeat(actionId, state) {
  const entries = STORIES[actionId];
  if (!entries) return null;

  // Separate specific (non-catch-all) beats from catch-alls.
  // When specific beats match, weight them 3× so they appear more often than catch-alls,
  // but catch-alls are still included for variety (prevents seeing the exact same beat
  // every time only one specific condition matches — e.g. praying on days 8-29).
  const specific = entries.filter(
    e => Object.keys(e.conditions).length > 0 && conditionsMet(e.conditions, state)
  );
  const catchAll = entries.filter(e => Object.keys(e.conditions).length === 0);

  // Build weighted pool: each specific entry counts 3×, each catch-all counts 1×
  let pool = specific.length > 0
    ? [...specific, ...specific, ...specific, ...catchAll]
    : catchAll;

  // Spiritual dryness bias: at spiritDry ≥ 6, double the weight of beats with penalties
  // on dry-sensitive actions. The picker still draws from the same pool — bad outcomes
  // just become more likely, not guaranteed.
  const dry = state.character?.spiritDry ?? 0;
  if (dry >= 6 && DRY_BIAS_ACTIONS.has(actionId)) {
    const extra = pool.filter(e => e.penalty);
    pool = [...pool, ...extra];
  }

  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  return null;
}

// Convenience wrapper — returns just the text string (used as fallback in hooks).
export function getStoryText(actionId, state) {
  return getStoryBeat(actionId, state)?.text ?? null;
}

function conditionsMet(conditions, state) {
  const { dayMin, dayMax, wisdomMin, wisdomMax, langMin, langMax, npcMet,
          contactsMin, contactsMax, spiritDryMin, spiritDryMax } = conditions;

  if (dayMin    !== undefined && state.time.day              < dayMin) return false;
  if (dayMax    !== undefined && state.time.day              > dayMax) return false;
  if (wisdomMin !== undefined && state.resources.wisdom      < wisdomMin) return false;
  if (wisdomMax !== undefined && state.resources.wisdom      > wisdomMax) return false;
  if (langMin   !== undefined && state.language.level        < langMin) return false;
  if (langMax   !== undefined && state.language.level        > langMax) return false;
  if (npcMet    !== undefined && !state.npcs[npcMet]?.met)              return false;
  if (contactsMin  !== undefined && state.resources.contacts < contactsMin) return false;
  if (contactsMax  !== undefined && state.resources.contacts > contactsMax) return false;
  if (spiritDryMin !== undefined && (state.character?.spiritDry ?? 0) < spiritDryMin) return false;
  if (spiritDryMax !== undefined && (state.character?.spiritDry ?? 0) > spiritDryMax) return false;

  // Dynamic conditions (stage, mood, stress, burden, daysNotSeen)
  for (const [key, val] of Object.entries(conditions)) {
    const stageMin = key.match(/^stageMin_(\w+)$/);
    const stageMax = key.match(/^stageMax_(\w+)$/);
    if (stageMin && (state.npcs[stageMin[1]]?.stage ?? -1) < val) return false;
    if (stageMax && (state.npcs[stageMax[1]]?.stage ?? 99) > val) return false;

    // Step 2: mood / stress / burden / daysNotSeen conditions
    const moodMin = key.match(/^moodMin_(\w+)$/);
    const moodMax = key.match(/^moodMax_(\w+)$/);
    const stressMin = key.match(/^stressMin_(\w+)$/);
    const stressMax = key.match(/^stressMax_(\w+)$/);
    const burdenMin = key.match(/^burdenMin_(\w+)$/);
    const burdenMax = key.match(/^burdenMax_(\w+)$/);
    const daysNotSeen = key.match(/^daysNotSeenMin_(\w+)$/);

    if (moodMin   && (state.npcs[moodMin[1]]?.mood     ?? 0) <  val) return false;
    if (moodMax   && (state.npcs[moodMax[1]]?.mood     ?? 0) >  val) return false;
    if (stressMin && (state.npcs[stressMin[1]]?.stress  ?? 0) <  val) return false;
    if (stressMax && (state.npcs[stressMax[1]]?.stress  ?? 0) >  val) return false;
    if (burdenMin && (state.npcs[burdenMin[1]]?.burden  ?? 0) <  val) return false;
    if (burdenMax && (state.npcs[burdenMax[1]]?.burden  ?? 0) >  val) return false;

    if (daysNotSeen) {
      const npcId = daysNotSeen[1];
      if (!state.npcs[npcId]?.met) return false;
      const lastSeen = state.npcs[npcId]?.lastSeenDay;
      const days = lastSeen === null ? 999 : (state.time.day - lastSeen);
      if (days < val) return false;
    }
  }

  return true;
}
