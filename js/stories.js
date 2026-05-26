// Story text selection for action completion popups.
// Loaded from data/stories.json at boot.

let STORIES = {};

export function initStoriesFromData(data) {
  STORIES = data;
}

// Returns a story text string for the given action and current state,
// or null if no stories are defined for that action.
export function getStoryText(actionId, state) {
  const entries = STORIES[actionId];
  if (!entries) return null;

  // Try specific (non-catch-all) entries first
  const specific = entries.filter(
    e => Object.keys(e.conditions).length > 0 && conditionsMet(e.conditions, state)
  );
  if (specific.length > 0) {
    return specific[Math.floor(Math.random() * specific.length)].text;
  }

  // Fall back to catch-all entries (empty conditions object)
  const catchAll = entries.filter(e => Object.keys(e.conditions).length === 0);
  if (catchAll.length > 0) {
    return catchAll[Math.floor(Math.random() * catchAll.length)].text;
  }

  return null;
}

function conditionsMet(conditions, state) {
  const { dayMin, dayMax, wisdomMin, langMin, langMax, npcMet } = conditions;

  if (dayMin    !== undefined && state.time.day              < dayMin) return false;
  if (dayMax    !== undefined && state.time.day              > dayMax) return false;
  if (wisdomMin !== undefined && state.resources.wisdom      < wisdomMin) return false;
  if (langMin   !== undefined && state.language.level        < langMin) return false;
  if (langMax   !== undefined && state.language.level        > langMax) return false;
  if (npcMet    !== undefined && !state.npcs[npcMet]?.met)              return false;

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
