import { parseDuration } from './parseDuration.js';
import { initActionsFromData } from './actions.js';
import { applyTimingFromData } from './resources.js';

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

export async function loadGameData() {
  const [actionsData, timingData] = await Promise.all([
    fetchJson('./data/actions.json'),
    fetchJson('./data/timing.json'),
  ]);

  initActionsFromData(actionsData);
  applyTimingFromData(timingData);
}
