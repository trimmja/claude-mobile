import { initActionsFromData } from './actions.js';
import { applyTimingFromData } from './resources.js';
import { initStoriesFromData } from './stories.js';
import { initReflectionsFromData } from './reflections.js';
import { initStageAdvancesFromData, initNPCEventsFromData } from './npcs.js';
import { initDayBeatsFromData } from './dayBeats.js';

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

export async function loadGameData() {
  const [actionsData, timingData, storiesData, reflectionsData, stageAdvancesData, npcEventsData, dayBeatsData] = await Promise.all([
    fetchJson('./data/actions.json'),
    fetchJson('./data/timing.json'),
    fetchJson('./data/stories.json').catch(() => ({})),
    fetchJson('./data/reflections.json').catch(() => ({ lines: [] })),
    fetchJson('./data/stageAdvances.json').catch(() => ({})),
    fetchJson('./data/npcEvents.json').catch(() => ({})),
    fetchJson('./data/dayBeats.json').catch(() => ({})),
  ]);

  initActionsFromData(actionsData);
  applyTimingFromData(timingData);
  initStoriesFromData(storiesData);
  initReflectionsFromData(reflectionsData);
  initStageAdvancesFromData(stageAdvancesData);
  initNPCEventsFromData(npcEventsData);
  initDayBeatsFromData(dayBeatsData);
}
