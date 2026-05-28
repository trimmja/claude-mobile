// End-of-day reflection picker.
// Reflections are matched against the day's events the same way stories.json
// beats are matched against an action's state. Specific matches weight 3×
// over catch-alls so authored, context-aware lines tend to win, but plain
// atmosphere lines still surface for variety.

import { state } from './state.js';
import { NPC_ACTION_MAP } from './actions.js';

let REFLECTIONS = [];

export function initReflectionsFromData(data) {
  // Accept either the new conditional shape `{ reflections: [...] }` or the
  // legacy flat `{ lines: [...] }` so a partial JSON deploy doesn't blank out
  // the reflection screen.
  if (Array.isArray(data?.reflections)) {
    REFLECTIONS = data.reflections;
  } else if (Array.isArray(data?.lines)) {
    REFLECTIONS = data.lines.map(text => ({ conditions: {}, text }));
  } else {
    REFLECTIONS = [];
  }
}

export function pickReflection() {
  if (REFLECTIONS.length === 0) return '';

  const specific = REFLECTIONS.filter(
    e => Object.keys(e.conditions || {}).length > 0 && reflectionConditionsMet(e.conditions)
  );
  const catchAll = REFLECTIONS.filter(e => Object.keys(e.conditions || {}).length === 0);

  const pool = specific.length > 0
    ? [...specific, ...specific, ...specific, ...catchAll]
    : catchAll;

  if (pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)].text;
}

function reflectionConditionsMet(conditions) {
  const {
    dayMin, dayMax,
    spiritDryMin, spiritDryMax,
    contactsTodayMin, contactsTodayMax,
    paydayToday, setbackToday, langLevelUpToday, noActionsToday,
  } = conditions;

  if (dayMin !== undefined && state.time.day < dayMin) return false;
  if (dayMax !== undefined && state.time.day > dayMax) return false;

  const dry = state.character?.spiritDry ?? 0;
  if (spiritDryMin !== undefined && dry < spiritDryMin) return false;
  if (spiritDryMax !== undefined && dry > spiritDryMax) return false;

  const startContacts = state.dayLog?.startContacts ?? 0;
  const contactsToday = state.resources.contacts - startContacts;
  if (contactsTodayMin !== undefined && contactsToday < contactsTodayMin) return false;
  if (contactsTodayMax !== undefined && contactsToday > contactsTodayMax) return false;

  if (paydayToday      === true && state.dayLog?.paydayToday      !== true) return false;
  if (setbackToday     === true && state.dayLog?.setbackToday     !== true) return false;
  if (langLevelUpToday === true && state.dayLog?.langLevelUpToday !== true) return false;

  if (noActionsToday === true) {
    const phases = state.dayLog?.phases || {};
    const total = (phases.morning?.length || 0) + (phases.afternoon?.length || 0) + (phases.evening?.length || 0);
    if (total > 0) return false;
  }

  // hadDeepVisitToday_<npcId>: scan the day's action log for any deep-conversation
  // action whose NPC_ACTION_MAP entry matches the requested NPC.
  for (const [key, val] of Object.entries(conditions)) {
    const deep = key.match(/^hadDeepVisitToday_(\w+)$/);
    if (deep && val === true) {
      const npcId = deep[1];
      const phases = state.dayLog?.phases || {};
      const all = [...(phases.morning || []), ...(phases.afternoon || []), ...(phases.evening || [])];
      const found = all.some(act => {
        const mapped = NPC_ACTION_MAP[act.id];
        if (mapped !== npcId) return false;
        // visit_* counts but the "deep" callback specifically wants the deep action ids
        return ['evening_kenji', 'questions_yuki', 'pray_hiro'].includes(act.id);
      });
      if (!found) return false;
    }
  }

  return true;
}
